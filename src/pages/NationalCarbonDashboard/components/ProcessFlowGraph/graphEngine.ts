import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createEmptyProcessFlowGraphSelection } from './graphSelection';
import type {
  ProcessFlowGraphData,
  ProcessFlowGraphEdge,
  ProcessFlowGraphInteractionMode,
  ProcessFlowGraphLayoutName,
  ProcessFlowGraphNode,
  ProcessFlowGraphSelection,
} from './graphTypes';
import { shouldRenderProcessFlowBaseEdges } from './graphVisibility';

type EngineCallbacks = {
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null, position?: { x: number; y: number }) => void;
};

type CameraFrame = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

type LayoutTransition = {
  cameraFrom: THREE.Vector3;
  cameraTo: THREE.Vector3;
  duration: number;
  edgeOpacity: number;
  deferredLayoutMode?: ProcessFlowGraphLayoutName;
  fromLayoutMode: ProcessFlowGraphLayoutName;
  highlightedEdgeOpacity: number;
  highlightedNodeFrom: Float32Array;
  highlightedNodeTo: Float32Array;
  nodeFrom: Float32Array;
  nodeTo: Float32Array;
  selectedNodeFrom: Float32Array;
  selectedNodeTo: Float32Array;
  sourceLayoutNodeIds?: Set<string>;
  startedAt: number;
  targetFrom: THREE.Vector3;
  targetTo: THREE.Vector3;
  toLayoutMode: ProcessFlowGraphLayoutName;
};

type CameraFocusTransition = {
  cameraFrom: THREE.Vector3;
  cameraTo: THREE.Vector3;
  duration: number;
  startedAt: number;
  targetFrom: THREE.Vector3;
  targetTo: THREE.Vector3;
};

type SphereSelectionTransition = {
  cameraFrom: THREE.Vector3;
  cameraTo: THREE.Vector3;
  duration: number;
  edgeOpacityFrom: number;
  edgeOpacityTo: number;
  flowMarkerOpacityFrom: number;
  flowMarkerOpacityTo: number;
  highlightedEdgeOpacityFrom: number;
  highlightedEdgeOpacityTo: number;
  highlightedNodeOpacityFrom: number;
  highlightedNodeOpacityTo: number;
  isFlatSelection?: boolean;
  selectedNodeFrom: Float32Array;
  selectedNodeTo: Float32Array;
  startedAt: number;
  targetFrom: THREE.Vector3;
  targetTo: THREE.Vector3;
};

type LayoutBounds = {
  centerX: number;
  centerY: number;
  height: number;
  width: number;
};

type FlowMarker = {
  arcLift: number;
  phase: number;
  source: string;
  surfaceLift: number;
  target: string;
};

type BaseEdgeRender = {
  edge: ProcessFlowGraphEdge;
  intensityScale: number;
};

type HighlightedEdgeRender = {
  edge: ProcessFlowGraphEdge;
  edgeIndex: number;
  intensityScale: number;
};

const clusterColorMap: Record<string, string> = {
  chemicals: '#24e7ff',
  energy: '#f6db4d',
  materials: '#75e66d',
  metals: '#ffb347',
  services: '#a873ff',
  transport: '#5194ff',
  waste: '#ff7b72',
};
const clusterPalette = [
  '#24e7ff',
  '#f6db4d',
  '#75e66d',
  '#ffb347',
  '#a873ff',
  '#5194ff',
  '#ff7b72',
  '#38f2a3',
  '#ff6dd6',
  '#d6ff5c',
  '#6effbc',
  '#f28482',
  '#b8f7ff',
  '#ffc857',
  '#7b61ff',
  '#4ecdc4',
  '#ff9f1c',
  '#c3f73a',
  '#ef476f',
  '#06d6a0',
  '#118ab2',
  '#ffd166',
  '#9b5de5',
  '#00f5d4',
];

const mutedColor = new THREE.Color('#5f7684');
const sphereMutedEdgeColor = new THREE.Color('#c3c7c1');
const selectedContextColor = new THREE.Color('#9cafb8');
const expandedSelectedContextColor = new THREE.Color('#91a9b8');
const selectedColor = new THREE.Color('#ffffff');
const inputHighlightColor = new THREE.Color('#23f4ff');
const outputHighlightColor = new THREE.Color('#b9f63c');
const transitionDustColors = [
  new THREE.Color('#c8fbff'),
  new THREE.Color('#ffd66d'),
  new THREE.Color('#b995ff'),
  new THREE.Color('#3ff7ff'),
];
const sphereEdgeSegments = 8;
const sphereHighlightedEdgeSegments = 18;
const sphereSurfaceLift = 2;
const sphereHighlightedSurfaceLift = 5;
const sphereSelectedEdgeSurfaceLift = 14;
const sphereSelectedEdgeArcLift = 20;
const sphereVisualRadius = 318;
const flowMarkerCycleMs = 1800;
const flowMarkerArrowSegments = 3;
const flowMarkerOpacity = 0.36;
const sphereFlowMarkerArrowLength = 5.8;
const sphereFlowMarkerArrowWidth = 2;
const expandedFlowMarkerArrowLength = 2.6;
const expandedFlowMarkerArrowWidth = 0.9;
const selectedEdgeBrightnessStops = [
  { edgeCount: 80, scale: 1 },
  { edgeCount: 200, scale: 0.88 },
  { edgeCount: 500, scale: 0.72 },
  { edgeCount: 1000, scale: 0.56 },
  { edgeCount: 2500, scale: 0.42 },
  { edgeCount: 5000, scale: 0.24 },
] as const;
const selectedNodePulseCycleMs = 1450;
const selectedNodePulseMinOpacity = 0.42;
const selectedNodePulseMaxOpacity = 0.98;
const sphereSelectedNodePulseBaseSize = 30;
const sphereSelectedNodePulseSizeDelta = 15;
const expandedSelectedNodePulseBaseSize = 26;
const expandedSelectedNodePulseSizeDelta = 12;
const expandedCameraDistance = 1040;
const expandedFocusCameraDistance = 560;
const expandedFitPadding = 130;
const expandedFitViewportScale = 0.9;
const sphereControlsMaxDistance = 1500;
const expandedControlsMaxDistance = 3200;
const pointPerspectiveBase = 760;
const cameraFocusDurationMs = 720;
const sphereSelectionTransitionDurationMs = 760;
const flatSelectionTransitionDurationMs = 520;
const layoutTransitionDurationMs = 1450;
const geoMapScopeTransitionDurationMs = 1280;
const transitionDustCount = 176;
const transitionRingSegments = 128;
const projectionGridMeridianCount = 11;
const projectionGridParallelCount = 7;
const projectionGridSegments = 48;
const projectionGridLineCount = projectionGridMeridianCount + projectionGridParallelCount;
const geoMapCameraPadding = 72;

const nodePointVertexShader = `
attribute float pointSize;
attribute vec3 color;
varying float vFacing;
varying vec3 vColor;

void main() {
  vColor = color;
  vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 worldNormal = normalize(worldPosition + vec3(0.0001));
  vec3 viewDirection = normalize(cameraPosition - worldPosition);
  vFacing = smoothstep(-0.12, 0.48, dot(worldNormal, viewDirection));
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = pointSize * (${pointPerspectiveBase.toFixed(1)} / max(1.0, -mvPosition.z));
  gl_Position = projectionMatrix * mvPosition;
}
`;

const nodePointFragmentShader = `
uniform sampler2D pointTexture;
uniform float backsideFade;
uniform float opacity;
varying float vFacing;
varying vec3 vColor;

void main() {
  vec4 sprite = texture2D(pointTexture, gl_PointCoord);
  float facingAlpha = mix(0.16, 1.0, vFacing);
  float alpha = sprite.a * opacity * mix(1.0, facingAlpha, backsideFade);
  if (alpha < 0.02) {
    discard;
  }
  gl_FragColor = vec4(vColor, alpha);
}
`;

function getClusterPaletteColor(index: number): THREE.Color {
  const normalizedIndex = Math.abs(index) % clusterPalette.length;

  return new THREE.Color(clusterPalette[normalizedIndex]);
}

function getStableHash(value: string): number {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function buildClusterColors(data: ProcessFlowGraphData): Map<string, THREE.Color> {
  const clusterColors = new Map<string, THREE.Color>();

  data.clustersLevel1?.forEach((cluster, index) => {
    const colorIndex = cluster.colorIndex ?? index;
    clusterColors.set(
      cluster.id,
      cluster.color ? new THREE.Color(cluster.color) : getClusterPaletteColor(colorIndex),
    );
  });

  data.nodes.forEach((node) => {
    if (clusterColors.has(node.clusterIdLevel1)) {
      return;
    }

    clusterColors.set(
      node.clusterIdLevel1,
      clusterColorMap[node.clusterIdLevel1]
        ? new THREE.Color(clusterColorMap[node.clusterIdLevel1])
        : getClusterPaletteColor(getStableHash(node.clusterIdLevel1)),
    );
  });

  return clusterColors;
}

function getLineMaterialOpacity(material: THREE.Material | undefined): number | undefined {
  if (material instanceof THREE.LineBasicMaterial) {
    return material.opacity;
  }

  return undefined;
}

function setLineMaterialOpacity(material: THREE.Material | undefined, opacity: number) {
  if (material instanceof THREE.LineBasicMaterial) {
    material.opacity = opacity;
  }
}

function getNodePointSize(
  node: ProcessFlowGraphNode | undefined,
  layoutMode: ProcessFlowGraphLayoutName,
  highlighted = false,
) {
  const isProcess = node?.kind === 'process';

  if (highlighted) {
    if (layoutMode === 'geoMap2d') {
      return isProcess ? 13 : 9;
    }
    return layoutMode === 'sphere3d' ? (isProcess ? 16 : 12) : isProcess ? 26 : 19;
  }

  if (layoutMode === 'sphere3d') {
    return isProcess ? 10 : 7.6;
  }

  if (layoutMode === 'geoMap2d') {
    return isProcess ? 7.8 : 5.8;
  }

  return isProcess ? 22 : 16;
}

function getNodeMaterialOpacity(layoutMode: ProcessFlowGraphLayoutName, hasSelection: boolean) {
  if (layoutMode === 'sphere3d') {
    return hasSelection ? 0.64 : 0.62;
  }

  return hasSelection
    ? layoutMode === 'expanded2d' || layoutMode === 'geoMap2d'
      ? 0.96
      : 0.68
    : 0.84;
}

function getNodeBacksideFade(layoutMode: ProcessFlowGraphLayoutName, hasSelection: boolean) {
  return layoutMode === 'sphere3d' && !hasSelection ? 1 : 0;
}

function isFlatLayout(layoutMode: ProcessFlowGraphLayoutName) {
  return layoutMode !== 'sphere3d';
}

function isExpandedLikeLayout(layoutMode: ProcessFlowGraphLayoutName) {
  return layoutMode === 'expanded2d' || layoutMode === 'geoMap2d';
}

function getNodeOverviewIntensity(node: ProcessFlowGraphNode | undefined) {
  return node?.kind === 'process' ? 0.8 : 0.98;
}

function getNodePosition(
  data: ProcessFlowGraphData,
  layoutMode: ProcessFlowGraphLayoutName,
  nodeId: string,
): [number, number, number] {
  return data.layouts[layoutMode]?.[nodeId] ?? [0, 0, 0];
}

function writeTuple(target: Float32Array, offset: number, value: [number, number, number]) {
  target[offset] = value[0];
  target[offset + 1] = value[1];
  target[offset + 2] = value[2];
}

function writeColor(target: Float32Array, offset: number, color: THREE.Color, intensity = 1) {
  target[offset] = color.r * intensity;
  target[offset + 1] = color.g * intensity;
  target[offset + 2] = color.b * intensity;
}

function getFairyEase(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function getSmoothStep(edge0: number, edge1: number, value: number) {
  const progress = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return progress * progress * (3 - 2 * progress);
}

function getTransitionSeed(index: number) {
  const seed = Math.sin((index + 1) * 12.9898) * 43758.5453;

  return seed - Math.floor(seed);
}

function capturePositionArray(geometry: THREE.BufferGeometry) {
  const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;

  if (!positionAttribute) {
    return new Float32Array();
  }

  return new Float32Array(positionAttribute.array as Float32Array);
}

function setGeometryPositionArray(geometry: THREE.BufferGeometry, positions: Float32Array) {
  const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;

  if (!positionAttribute || positionAttribute.array.length !== positions.length) {
    return;
  }

  (positionAttribute.array as Float32Array).set(positions);
  positionAttribute.needsUpdate = true;
  geometry.computeBoundingSphere();
}

function getEdgeTransitionFade(progress: number) {
  if (progress < 0.44) {
    return 0;
  }

  return getSmoothStep(0.44, 1, progress);
}

function isSphereToGeoMapTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return transition.fromLayoutMode === 'sphere3d' && transition.toLayoutMode === 'geoMap2d';
}

function isGeoMapToSphereTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return transition.fromLayoutMode === 'geoMap2d' && transition.toLayoutMode === 'sphere3d';
}

function getGeoProjectionForwardProgress(
  progress: number,
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return isGeoMapToSphereTransition(transition) ? 1 - progress : progress;
}

function isSphereToExpandedTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return transition.fromLayoutMode === 'sphere3d' && transition.toLayoutMode === 'expanded2d';
}

function isExpandedToSphereTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return transition.fromLayoutMode === 'expanded2d' && transition.toLayoutMode === 'sphere3d';
}

function isSphereExpandedTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return isSphereToExpandedTransition(transition) || isExpandedToSphereTransition(transition);
}

function getSphereExpandedForwardProgress(
  progress: number,
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return isExpandedToSphereTransition(transition) ? 1 - progress : progress;
}

function isExpandedGeoMapTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return (
    (transition.fromLayoutMode === 'expanded2d' && transition.toLayoutMode === 'geoMap2d') ||
    (transition.fromLayoutMode === 'geoMap2d' && transition.toLayoutMode === 'expanded2d')
  );
}

function isGeoMapToExpandedTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return transition.fromLayoutMode === 'geoMap2d' && transition.toLayoutMode === 'expanded2d';
}

function getExpandedGeoMapForwardProgress(
  progress: number,
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return isGeoMapToExpandedTransition(transition) ? 1 - progress : progress;
}

function isGeoMapScopeTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return transition.fromLayoutMode === 'geoMap2d' && transition.toLayoutMode === 'geoMap2d';
}

function isGeoProjectionTransition(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return isSphereToGeoMapTransition(transition) || isGeoMapToSphereTransition(transition);
}

function doesTransitionInvolveSphere(
  transition: Pick<LayoutTransition, 'fromLayoutMode' | 'toLayoutMode'>,
) {
  return transition.fromLayoutMode === 'sphere3d' || transition.toLayoutMode === 'sphere3d';
}

function getSelectedEdgeBrightnessScale(edgeCount: number) {
  const [firstStop] = selectedEdgeBrightnessStops;

  if (edgeCount <= firstStop.edgeCount) {
    return firstStop.scale;
  }

  for (let index = 1; index < selectedEdgeBrightnessStops.length; index += 1) {
    const previousStop = selectedEdgeBrightnessStops[index - 1];
    const nextStop = selectedEdgeBrightnessStops[index];

    if (edgeCount <= nextStop.edgeCount) {
      const progress = getSmoothStep(previousStop.edgeCount, nextStop.edgeCount, edgeCount);

      return THREE.MathUtils.lerp(previousStop.scale, nextStop.scale, progress);
    }
  }

  return selectedEdgeBrightnessStops[selectedEdgeBrightnessStops.length - 1].scale;
}

function createPointTexture() {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (!context) {
    return undefined;
  }

  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.34, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.66, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function getTupleLength(value: [number, number, number]) {
  return Math.hypot(value[0], value[1], value[2]) || 1;
}

function getTupleDot(left: [number, number, number], right: [number, number, number]) {
  const leftLength = getTupleLength(left);
  const rightLength = getTupleLength(right);

  return (
    (left[0] / leftLength) * (right[0] / rightLength) +
    (left[1] / leftLength) * (right[1] / rightLength) +
    (left[2] / leftLength) * (right[2] / rightLength)
  );
}

function getSphereArcPoint(
  source: [number, number, number],
  target: [number, number, number],
  progress: number,
  lift: number,
  arcLift = 0,
): [number, number, number] {
  const sourceLength = getTupleLength(source);
  const targetLength = getTupleLength(target);
  const sourceX = source[0] / sourceLength;
  const sourceY = source[1] / sourceLength;
  const sourceZ = source[2] / sourceLength;
  const targetX = target[0] / targetLength;
  const targetY = target[1] / targetLength;
  const targetZ = target[2] / targetLength;
  const dot = Math.max(
    -0.999,
    Math.min(0.999, sourceX * targetX + sourceY * targetY + sourceZ * targetZ),
  );
  const angle = Math.acos(dot);
  const sinAngle = Math.sin(angle);
  let x = sourceX;
  let y = sourceY;
  let z = sourceZ;

  if (Math.abs(sinAngle) > 0.0001) {
    const sourceWeight = Math.sin((1 - progress) * angle) / sinAngle;
    const targetWeight = Math.sin(progress * angle) / sinAngle;
    x = sourceX * sourceWeight + targetX * targetWeight;
    y = sourceY * sourceWeight + targetY * targetWeight;
    z = sourceZ * sourceWeight + targetZ * targetWeight;
  } else {
    x = sourceX + (targetX - sourceX) * progress;
    y = sourceY + (targetY - sourceY) * progress;
    z = sourceZ + (targetZ - sourceZ) * progress;
  }

  const unitLength = Math.hypot(x, y, z) || 1;
  const liftProfile = Math.sin(Math.PI * progress) ** 2;
  const radius =
    sourceLength * (1 - progress) + targetLength * progress + liftProfile * (lift + arcLift);

  return [(x / unitLength) * radius, (y / unitLength) * radius, (z / unitLength) * radius];
}

function getEdgeColor(direction: string) {
  return direction === 'input' ? inputHighlightColor : outputHighlightColor;
}

function setFlowMarkerVector({
  arcLift,
  layoutMode,
  output,
  progress,
  source,
  surfaceLift,
  target,
}: {
  arcLift: number;
  layoutMode: ProcessFlowGraphLayoutName;
  output: THREE.Vector3;
  progress: number;
  source: [number, number, number];
  surfaceLift: number;
  target: [number, number, number];
}) {
  if (layoutMode !== 'sphere3d') {
    output.set(
      source[0] + (target[0] - source[0]) * progress,
      source[1] + (target[1] - source[1]) * progress,
      source[2] + (target[2] - source[2]) * progress,
    );
    return;
  }

  const sourceLength = getTupleLength(source);
  const targetLength = getTupleLength(target);
  const sourceX = source[0] / sourceLength;
  const sourceY = source[1] / sourceLength;
  const sourceZ = source[2] / sourceLength;
  const targetX = target[0] / targetLength;
  const targetY = target[1] / targetLength;
  const targetZ = target[2] / targetLength;
  const dot = Math.max(
    -0.999,
    Math.min(0.999, sourceX * targetX + sourceY * targetY + sourceZ * targetZ),
  );
  const angle = Math.acos(dot);
  const sinAngle = Math.sin(angle);
  let x = sourceX;
  let y = sourceY;
  let z = sourceZ;

  if (Math.abs(sinAngle) > 0.0001) {
    const sourceWeight = Math.sin((1 - progress) * angle) / sinAngle;
    const targetWeight = Math.sin(progress * angle) / sinAngle;
    x = sourceX * sourceWeight + targetX * targetWeight;
    y = sourceY * sourceWeight + targetY * targetWeight;
    z = sourceZ * sourceWeight + targetZ * targetWeight;
  } else {
    x = sourceX + (targetX - sourceX) * progress;
    y = sourceY + (targetY - sourceY) * progress;
    z = sourceZ + (targetZ - sourceZ) * progress;
  }

  const unitLength = Math.hypot(x, y, z) || 1;
  const liftProfile = Math.sin(Math.PI * progress) ** 2;
  const radius =
    sourceLength * (1 - progress) + targetLength * progress + liftProfile * (surfaceLift + arcLift);

  output.set((x / unitLength) * radius, (y / unitLength) * radius, (z / unitLength) * radius);
}

function createSphereShell() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(sphereVisualRadius, 80, 40),
    new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: '#1feaff',
      depthWrite: false,
      opacity: 0.035,
      side: THREE.DoubleSide,
      transparent: true,
    }),
  );
}

function createNodePointMaterial(pointTexture: THREE.Texture | undefined, opacity: number) {
  return new THREE.ShaderMaterial({
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fragmentShader: nodePointFragmentShader,
    transparent: true,
    uniforms: {
      backsideFade: { value: 0 },
      opacity: { value: opacity },
      pointTexture: { value: pointTexture },
    },
    vertexShader: nodePointVertexShader,
  });
}

export class ProcessFlowGraphEngine {
  private callbacks: EngineCallbacks;

  private camera: THREE.PerspectiveCamera;

  private container: HTMLElement;

  private controls: OrbitControls;

  private data: ProcessFlowGraphData;

  private clusterColors: Map<string, THREE.Color>;

  private edgeGeometry = new THREE.BufferGeometry();

  private edgeLines?: THREE.LineSegments;

  private group = new THREE.Group();

  private highlightedEdgeGeometry = new THREE.BufferGeometry();

  private highlightedEdgeLines?: THREE.LineSegments;

  private flowMarkerGeometry = new THREE.BufferGeometry();

  private flowMarkerLines?: THREE.LineSegments;

  private flowMarkers: FlowMarker[] = [];

  private highlightedNodeGeometry = new THREE.BufferGeometry();

  private highlightedNodePoints?: THREE.Points;

  private hoveredNodeId: string | null = null;

  private interactionMode: ProcessFlowGraphInteractionMode;

  private geoMapBackdropFrameStyle?: string;

  private geoMapProjectionCorners = [
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
    new THREE.Vector3(),
  ];

  private layoutMode: ProcessFlowGraphLayoutName;

  private cameraFocusTransition?: CameraFocusTransition;

  private transition?: LayoutTransition;

  private transitionDustGeometry = new THREE.BufferGeometry();

  private transitionDustPoints?: THREE.Points;

  private transitionEffectGroup = new THREE.Group();

  private transitionGateGeometry = new THREE.BufferGeometry();

  private transitionGateLines?: THREE.LineSegments;

  private transitionProjectionGeometry = new THREE.BufferGeometry();

  private transitionProjectionLines?: THREE.LineSegments;

  private transitionRingGeometry = new THREE.BufferGeometry();

  private transitionRing?: THREE.Line;

  private nodeGeometry = new THREE.BufferGeometry();

  private nodePoints?: THREE.Points;

  private pointTexture?: THREE.Texture;

  private raycaster = new THREE.Raycaster();

  private renderer: THREE.WebGLRenderer;

  private scene = new THREE.Scene();

  private selectedNodeGeometry = new THREE.BufferGeometry();

  private selectedNodePoint?: THREE.Points;

  private selection: ProcessFlowGraphSelection = createEmptyProcessFlowGraphSelection();

  private selectedNodeRevealProgress = 1;

  private sphereSelectionTransition?: SphereSelectionTransition;

  private sphereShell?: THREE.Mesh;

  constructor({
    callbacks,
    container,
    data,
    interactionMode,
    layoutMode,
  }: {
    callbacks?: EngineCallbacks;
    container: HTMLElement;
    data: ProcessFlowGraphData;
    interactionMode: ProcessFlowGraphInteractionMode;
    layoutMode: ProcessFlowGraphLayoutName;
  }) {
    this.callbacks = callbacks ?? {};
    this.container = container;
    this.data = data;
    this.clusterColors = buildClusterColors(data);
    this.interactionMode = interactionMode;
    this.layoutMode = layoutMode;
    this.camera = new THREE.PerspectiveCamera(42, 1, 1, 5000);
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearAlpha(0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);
    this.pointTexture = createPointTexture();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = sphereControlsMaxDistance;
    this.controls.minDistance = 120;
    this.updateControlInteractionMode();
    this.raycaster.params.Points = { threshold: 8 };
    this.scene.add(this.group);
    this.scene.add(this.transitionEffectGroup);
    this.scene.add(new THREE.AmbientLight(0x8ccfff, 1.4));
    this.buildTransitionEffect();
    this.buildScene();
    this.attachEvents();
    this.resize();
    this.resetCamera();
    this.renderer.setAnimationLoop(this.render);
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    this.detachEvents();
    this.controls.dispose();
    this.nodeGeometry.dispose();
    this.edgeGeometry.dispose();
    this.highlightedNodeGeometry.dispose();
    this.highlightedEdgeGeometry.dispose();
    this.flowMarkerGeometry.dispose();
    this.selectedNodeGeometry.dispose();
    this.transitionDustGeometry.dispose();
    this.transitionGateGeometry.dispose();
    this.transitionProjectionGeometry.dispose();
    this.transitionRingGeometry.dispose();
    this.sphereShell?.geometry.dispose();
    if (this.sphereShell?.material instanceof THREE.Material) {
      this.sphereShell.material.dispose();
    }
    if (this.transitionDustPoints?.material instanceof THREE.Material) {
      this.transitionDustPoints.material.dispose();
    }
    if (this.transitionGateLines?.material instanceof THREE.Material) {
      this.transitionGateLines.material.dispose();
    }
    if (this.transitionProjectionLines?.material instanceof THREE.Material) {
      this.transitionProjectionLines.material.dispose();
    }
    if (this.transitionRing?.material instanceof THREE.Material) {
      this.transitionRing.material.dispose();
    }
    if (this.flowMarkerLines?.material instanceof THREE.Material) {
      this.flowMarkerLines.material.dispose();
    }
    this.clearGeoMapBackdropFrame();
    this.pointTexture?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  resize = () => {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  setCallbacks(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  setInteractionMode(interactionMode: ProcessFlowGraphInteractionMode) {
    this.interactionMode = interactionMode;
    this.renderer.domElement.style.cursor = interactionMode === 'select' ? 'pointer' : 'grab';
  }

  private captureNodePositionMap() {
    const positionMap = new Map<string, [number, number, number]>();
    const positionAttribute = this.nodeGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    if (!positionAttribute) {
      return positionMap;
    }

    const positions = positionAttribute.array as Float32Array;
    const vector = new THREE.Vector3();

    this.data.nodes.forEach((node, index) => {
      vector.fromArray(positions, index * 3);
      vector.applyEuler(this.group.rotation);
      positionMap.set(node.id, [vector.x, vector.y, vector.z]);
    });

    return positionMap;
  }

  private buildMappedNodePositions(
    nodeIds: string[],
    positionMap: Map<string, [number, number, number]>,
    fallbackPositions: Float32Array,
    fallbackPosition?: [number, number, number],
  ) {
    const mappedPositions = new Float32Array(nodeIds.length * 3);

    nodeIds.forEach((nodeId, index) => {
      const offset = index * 3;
      const position = positionMap.get(nodeId);

      if (position) {
        writeTuple(mappedPositions, offset, position);
        return;
      }

      if (fallbackPosition) {
        writeTuple(mappedPositions, offset, fallbackPosition);
        return;
      }

      mappedPositions[offset] = fallbackPositions[offset] ?? 0;
      mappedPositions[offset + 1] = fallbackPositions[offset + 1] ?? 0;
      mappedPositions[offset + 2] = fallbackPositions[offset + 2] ?? 0;
    });

    return mappedPositions;
  }

  private buildLayoutNodePositions(nodeIds: string[], layoutMode: ProcessFlowGraphLayoutName) {
    const positions = new Float32Array(nodeIds.length * 3);

    nodeIds.forEach((nodeId, index) => {
      writeTuple(positions, index * 3, getNodePosition(this.data, layoutMode, nodeId));
    });

    return positions;
  }

  private keepMissingSourceNodesAtTarget(
    nodeIds: string[],
    sourceNodeIds: Set<string> | undefined,
    fromPositions: Float32Array,
    toPositions: Float32Array,
  ) {
    if (!sourceNodeIds) {
      return;
    }

    nodeIds.forEach((nodeId, index) => {
      if (sourceNodeIds.has(nodeId)) {
        return;
      }

      const offset = index * 3;
      fromPositions[offset] = toPositions[offset] ?? fromPositions[offset];
      fromPositions[offset + 1] = toPositions[offset + 1] ?? fromPositions[offset + 1];
      fromPositions[offset + 2] = toPositions[offset + 2] ?? fromPositions[offset + 2];
    });
  }

  setData(data: ProcessFlowGraphData) {
    this.finishCameraFocusTransition(false);
    this.finishLayoutTransition(false);
    this.finishSphereSelectionTransition(false);
    this.data = data;
    this.clusterColors = buildClusterColors(data);
    this.buildScene();
    this.resetCamera();
  }

  setDataLayoutAndSelection(
    data: ProcessFlowGraphData,
    layoutMode: ProcessFlowGraphLayoutName,
    selection: ProcessFlowGraphSelection,
  ) {
    if (this.data === data && this.layoutMode === layoutMode) {
      this.setSelection(selection);
      return;
    }

    const shouldTransitionLayout = this.layoutMode !== layoutMode;

    if (!shouldTransitionLayout) {
      if (this.layoutMode === 'geoMap2d' && layoutMode === 'geoMap2d') {
        const fromLayoutMode = this.layoutMode;
        const nodePositionMap = this.captureNodePositionMap();
        const frameFrom: CameraFrame = {
          position: this.camera.position.clone(),
          target: this.controls.target.clone(),
        };

        this.finishCameraFocusTransition(false);
        this.finishLayoutTransition(false);
        this.data = data;
        this.clusterColors = buildClusterColors(data);
        this.selection = selection;
        this.layoutMode = layoutMode;
        this.updateControlInteractionMode();
        this.group.rotation.set(0, 0, 0);
        this.buildScene();

        const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
        const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
          | THREE.LineBasicMaterial
          | undefined;
        const nodeTo = capturePositionArray(this.nodeGeometry);
        const highlightedNodeTo = capturePositionArray(this.highlightedNodeGeometry);
        const selectedNodeTo = capturePositionArray(this.selectedNodeGeometry);
        const fallbackPosition: [number, number, number] = [
          frameFrom.target.x,
          frameFrom.target.y,
          0,
        ];
        const nodeFrom = this.buildMappedNodePositions(
          this.data.nodes.map((node) => node.id),
          nodePositionMap,
          nodeTo,
          fallbackPosition,
        );
        const highlightedNodeFrom = this.buildMappedNodePositions(
          Array.from(this.selection.highlightedNodeIds),
          nodePositionMap,
          highlightedNodeTo,
          fallbackPosition,
        );
        const selectedNodeFrom = this.buildMappedNodePositions(
          this.selection.selectedNodeId ? [this.selection.selectedNodeId] : [],
          nodePositionMap,
          selectedNodeTo,
          fallbackPosition,
        );
        const frameTo = this.getCameraFrame(layoutMode);

        setGeometryPositionArray(this.nodeGeometry, nodeFrom);
        setGeometryPositionArray(this.highlightedNodeGeometry, highlightedNodeFrom);
        setGeometryPositionArray(this.selectedNodeGeometry, selectedNodeFrom);
        this.transition = {
          cameraFrom: frameFrom.position,
          cameraTo: frameTo.position,
          duration: geoMapScopeTransitionDurationMs,
          edgeOpacity: edgeMaterial?.opacity ?? 0.12,
          fromLayoutMode,
          highlightedEdgeOpacity: getLineMaterialOpacity(highlightedEdgeMaterial) ?? 0.9,
          highlightedNodeFrom,
          highlightedNodeTo,
          nodeFrom,
          nodeTo,
          selectedNodeFrom,
          selectedNodeTo,
          startedAt: performance.now(),
          targetFrom: frameFrom.target,
          targetTo: frameTo.target,
          toLayoutMode: layoutMode,
        };
        this.controls.enabled = false;
        this.transitionEffectGroup.visible = true;
        this.updateLayoutTransition(0);
        return;
      }

      this.finishCameraFocusTransition(false);
      this.finishLayoutTransition(false);
      this.finishSphereSelectionTransition(false);
      this.data = data;
      this.clusterColors = buildClusterColors(data);
      this.selection = selection;
      this.buildScene();
      this.resetCamera();
      return;
    }

    const fromLayoutMode = this.layoutMode;
    const nodePositionMap = this.captureNodePositionMap();
    const frameFrom: CameraFrame = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
    const shouldDeferSourceScene =
      (fromLayoutMode === 'expanded2d' && layoutMode === 'sphere3d') ||
      (fromLayoutMode === 'geoMap2d' && (layoutMode === 'sphere3d' || layoutMode === 'expanded2d'));

    if (shouldDeferSourceScene) {
      this.finishCameraFocusTransition(false);
      this.finishLayoutTransition(false);
      this.finishSphereSelectionTransition(false);
      this.data = data;
      this.clusterColors = buildClusterColors(data);
      this.selection = selection;
      this.layoutMode = fromLayoutMode;
      this.updateControlInteractionMode();
      this.group.rotation.set(0, 0, 0);
      this.buildScene();

      const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
      const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
        | THREE.LineBasicMaterial
        | undefined;
      const nodeFromFallback = capturePositionArray(this.nodeGeometry);
      const highlightedNodeFromFallback = capturePositionArray(this.highlightedNodeGeometry);
      const selectedNodeFromFallback = capturePositionArray(this.selectedNodeGeometry);
      const allNodeIds = this.data.nodes.map((node) => node.id);
      const highlightedNodeIds = Array.from(this.selection.highlightedNodeIds);
      const selectedNodeIds = this.selection.selectedNodeId ? [this.selection.selectedNodeId] : [];
      const sourceLayoutNodeIds =
        fromLayoutMode === 'geoMap2d' ? new Set(nodePositionMap.keys()) : undefined;
      const nodeFrom = this.buildMappedNodePositions(allNodeIds, nodePositionMap, nodeFromFallback);
      const highlightedNodeFrom = this.buildMappedNodePositions(
        highlightedNodeIds,
        nodePositionMap,
        highlightedNodeFromFallback,
      );
      const selectedNodeFrom = this.buildMappedNodePositions(
        selectedNodeIds,
        nodePositionMap,
        selectedNodeFromFallback,
      );
      const nodeTo = this.buildLayoutNodePositions(allNodeIds, layoutMode);
      const highlightedNodeTo = this.buildLayoutNodePositions(highlightedNodeIds, layoutMode);
      const selectedNodeTo = this.buildLayoutNodePositions(selectedNodeIds, layoutMode);
      const frameTo = this.getCameraFrame(layoutMode);

      this.keepMissingSourceNodesAtTarget(allNodeIds, sourceLayoutNodeIds, nodeFrom, nodeTo);
      this.keepMissingSourceNodesAtTarget(
        highlightedNodeIds,
        sourceLayoutNodeIds,
        highlightedNodeFrom,
        highlightedNodeTo,
      );
      this.keepMissingSourceNodesAtTarget(
        selectedNodeIds,
        sourceLayoutNodeIds,
        selectedNodeFrom,
        selectedNodeTo,
      );
      setGeometryPositionArray(this.nodeGeometry, nodeFrom);
      setGeometryPositionArray(this.highlightedNodeGeometry, highlightedNodeFrom);
      setGeometryPositionArray(this.selectedNodeGeometry, selectedNodeFrom);
      this.transition = {
        cameraFrom: frameFrom.position,
        cameraTo: frameTo.position,
        deferredLayoutMode: layoutMode,
        duration: layoutTransitionDurationMs,
        edgeOpacity: edgeMaterial?.opacity ?? 0.16,
        fromLayoutMode,
        highlightedEdgeOpacity: getLineMaterialOpacity(highlightedEdgeMaterial) ?? 0.95,
        highlightedNodeFrom,
        highlightedNodeTo,
        nodeFrom,
        nodeTo,
        selectedNodeFrom,
        selectedNodeTo,
        sourceLayoutNodeIds,
        startedAt: performance.now(),
        targetFrom: frameFrom.target,
        targetTo: frameTo.target,
        toLayoutMode: layoutMode,
      };
      this.controls.enabled = false;
      this.transitionEffectGroup.visible = true;
      this.updateLayoutTransition(0);
      return;
    }

    this.finishCameraFocusTransition(false);
    this.finishLayoutTransition(false);
    this.finishSphereSelectionTransition(false);
    this.data = data;
    this.clusterColors = buildClusterColors(data);
    this.selection = selection;
    this.layoutMode = layoutMode;
    this.updateControlInteractionMode();
    this.group.rotation.set(0, 0, 0);
    this.buildScene();

    const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
    const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const nodeTo = capturePositionArray(this.nodeGeometry);
    const highlightedNodeTo = capturePositionArray(this.highlightedNodeGeometry);
    const selectedNodeTo = capturePositionArray(this.selectedNodeGeometry);
    const nodeFrom = this.buildMappedNodePositions(
      this.data.nodes.map((node) => node.id),
      nodePositionMap,
      nodeTo,
    );
    const highlightedNodeFrom = this.buildMappedNodePositions(
      Array.from(this.selection.highlightedNodeIds),
      nodePositionMap,
      highlightedNodeTo,
    );
    const selectedNodeFrom = this.buildMappedNodePositions(
      this.selection.selectedNodeId ? [this.selection.selectedNodeId] : [],
      nodePositionMap,
      selectedNodeTo,
    );
    const frameTo = this.getCameraFrame(layoutMode);

    setGeometryPositionArray(this.nodeGeometry, nodeFrom);
    setGeometryPositionArray(this.highlightedNodeGeometry, highlightedNodeFrom);
    setGeometryPositionArray(this.selectedNodeGeometry, selectedNodeFrom);
    this.transition = {
      cameraFrom: frameFrom.position,
      cameraTo: frameTo.position,
      duration: layoutTransitionDurationMs,
      edgeOpacity: edgeMaterial?.opacity ?? 0.16,
      fromLayoutMode,
      highlightedEdgeOpacity: getLineMaterialOpacity(highlightedEdgeMaterial) ?? 0.95,
      highlightedNodeFrom,
      highlightedNodeTo,
      nodeFrom,
      nodeTo,
      selectedNodeFrom,
      selectedNodeTo,
      startedAt: performance.now(),
      targetFrom: frameFrom.target,
      targetTo: frameTo.target,
      toLayoutMode: layoutMode,
    };
    this.controls.enabled = false;
    this.transitionEffectGroup.visible = true;
    this.updateLayoutTransition(0);
  }

  setLayoutMode(layoutMode: ProcessFlowGraphLayoutName) {
    if (this.layoutMode === layoutMode) {
      return;
    }

    const fromLayoutMode = this.layoutMode;
    const nodeFrom = capturePositionArray(this.nodeGeometry);
    const highlightedNodeFrom = capturePositionArray(this.highlightedNodeGeometry);
    const selectedNodeFrom = capturePositionArray(this.selectedNodeGeometry);
    const frameFrom: CameraFrame = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };

    this.finishCameraFocusTransition(false);
    this.finishLayoutTransition(false);
    this.finishSphereSelectionTransition(false);
    this.layoutMode = layoutMode;
    this.updateControlInteractionMode();
    this.group.rotation.set(0, 0, 0);
    this.updateGeometryPositions();
    this.updateHighlightedGeometry();
    this.updateMaterialState();
    const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
    const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const nodeTo = capturePositionArray(this.nodeGeometry);
    const highlightedNodeTo = capturePositionArray(this.highlightedNodeGeometry);
    const selectedNodeTo = capturePositionArray(this.selectedNodeGeometry);
    const frameTo = this.getCameraFrame(layoutMode);

    setGeometryPositionArray(this.nodeGeometry, nodeFrom);
    setGeometryPositionArray(this.highlightedNodeGeometry, highlightedNodeFrom);
    setGeometryPositionArray(this.selectedNodeGeometry, selectedNodeFrom);
    this.transition = {
      cameraFrom: frameFrom.position,
      cameraTo: frameTo.position,
      duration: layoutTransitionDurationMs,
      edgeOpacity: edgeMaterial?.opacity ?? 0.16,
      fromLayoutMode,
      highlightedEdgeOpacity: getLineMaterialOpacity(highlightedEdgeMaterial) ?? 0.95,
      highlightedNodeFrom,
      highlightedNodeTo,
      nodeFrom,
      nodeTo,
      selectedNodeFrom,
      selectedNodeTo,
      startedAt: performance.now(),
      targetFrom: frameFrom.target,
      targetTo: frameTo.target,
      toLayoutMode: layoutMode,
    };
    this.controls.enabled = false;
    this.transitionEffectGroup.visible = true;
    this.updateLayoutTransition(0);
  }

  setSelection(selection: ProcessFlowGraphSelection) {
    const previousSelectedNodeId = this.selection.selectedNodeId;
    const selectedNodeFrom = capturePositionArray(this.selectedNodeGeometry);
    this.finishCameraFocusTransition(true);
    this.finishLayoutTransition(true);
    this.finishSphereSelectionTransition(false);
    const shouldRevealSphereSelection =
      this.layoutMode === 'sphere3d' &&
      Boolean(selection.selectedNodeId) &&
      previousSelectedNodeId !== selection.selectedNodeId;
    const shouldRevealFlatSelection =
      isExpandedLikeLayout(this.layoutMode) &&
      Boolean(selection.selectedNodeId) &&
      previousSelectedNodeId !== selection.selectedNodeId;
    const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
    const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const flowMarkerMaterial = this.flowMarkerLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const highlightedNodeMaterial = this.highlightedNodePoints?.material;
    const edgeOpacityFrom = edgeMaterial?.opacity ?? 0;
    const highlightedEdgeOpacityFrom = shouldRevealSphereSelection
      ? 0
      : (getLineMaterialOpacity(highlightedEdgeMaterial) ?? 0);
    const flowMarkerOpacityFrom = shouldRevealSphereSelection
      ? 0
      : (flowMarkerMaterial?.opacity ?? 0);
    const highlightedNodeOpacityFrom =
      shouldRevealSphereSelection || !(highlightedNodeMaterial instanceof THREE.ShaderMaterial)
        ? 0
        : highlightedNodeMaterial.uniforms.opacity.value;

    this.selection = selection;

    this.buildEdgeGeometry();
    this.updateNodeColors();
    this.updateHighlightedGeometry();
    this.updateMaterialState();

    if (shouldRevealSphereSelection && selection.selectedNodeId) {
      this.startSphereSelectionTransition({
        edgeOpacityFrom,
        flowMarkerOpacityFrom,
        highlightedEdgeOpacityFrom,
        highlightedNodeOpacityFrom,
        selectedNodeFrom,
        selectedNodeId: selection.selectedNodeId,
      });
      return;
    }

    if (shouldRevealFlatSelection) {
      this.startFlatSelectionTransition({
        edgeOpacityFrom,
        flowMarkerOpacityFrom,
        highlightedEdgeOpacityFrom,
        highlightedNodeOpacityFrom,
        selectedNodeFrom,
      });
    }
  }

  resetCamera() {
    const frame = this.getCameraFrame(this.layoutMode);

    this.camera.position.copy(frame.position);
    this.controls.target.copy(frame.target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private getCameraFrame(layoutMode: ProcessFlowGraphLayoutName): CameraFrame {
    if (layoutMode === 'sphere3d') {
      return {
        position: new THREE.Vector3(0, 0, this.getSphereCameraDistance()),
        target: new THREE.Vector3(0, 0, 0),
      };
    }

    const bounds = this.getExpandedLayoutBounds(layoutMode);
    return {
      position: new THREE.Vector3(
        bounds.centerX,
        bounds.centerY,
        this.getExpandedCameraDistance(layoutMode),
      ),
      target: new THREE.Vector3(bounds.centerX, bounds.centerY, 0),
    };
  }

  private getExpandedLayoutBounds(
    layoutMode: ProcessFlowGraphLayoutName = this.layoutMode,
  ): LayoutBounds {
    if (layoutMode === 'geoMap2d' && this.data.geoMapFrame) {
      return {
        centerX: 0,
        centerY: 0,
        height: this.data.geoMapFrame.height,
        width: this.data.geoMapFrame.width,
      };
    }

    const layout = this.data.layouts[layoutMode] ?? this.data.layouts.expanded2d;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const node of this.data.nodes) {
      const position = layout[node.id];
      if (!position) {
        continue;
      }

      const [x, y] = position;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxY)
    ) {
      return { centerX: 0, centerY: 0, height: 1, width: 1 };
    }

    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
      height: Math.max(1, maxY - minY),
      width: Math.max(1, maxX - minX),
    };
  }

  private getExpandedCameraDistance(layoutMode: ProcessFlowGraphLayoutName = this.layoutMode) {
    const bounds = this.getExpandedLayoutBounds(layoutMode);
    const rect = this.container.getBoundingClientRect();
    const aspect = Math.max(0.6, rect.width / Math.max(1, rect.height));
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const fitPadding = layoutMode === 'geoMap2d' ? geoMapCameraPadding : expandedFitPadding;
    const visualHeight = bounds.height + fitPadding * 2;
    const visualWidth = bounds.width + fitPadding * 2;
    const verticalDistance =
      visualHeight / (2 * Math.tan(verticalFov / 2) * expandedFitViewportScale);
    const horizontalDistance =
      visualWidth / (2 * Math.tan(verticalFov / 2) * aspect * expandedFitViewportScale);

    return Math.max(expandedCameraDistance, verticalDistance, horizontalDistance);
  }

  private getSphereCameraDistance() {
    const rect = this.container.getBoundingClientRect();
    const aspect = Math.max(0.6, rect.width / Math.max(1, rect.height));
    const selectedEdgeAllowance = this.selection.selectedNodeId
      ? sphereSelectedEdgeSurfaceLift + sphereSelectedEdgeArcLift
      : sphereSurfaceLift;
    const visualRadius = sphereVisualRadius + selectedEdgeAllowance + 16;
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const verticalDistance = visualRadius / (Math.tan(verticalFov / 2) * 0.86);
    const horizontalDistance = visualRadius / (Math.tan(verticalFov / 2) * aspect * 0.9);

    return Math.max(980, Math.min(1180, Math.max(verticalDistance, horizontalDistance)));
  }

  private updateControlInteractionMode() {
    const isFlat = isFlatLayout(this.layoutMode);

    this.controls.enablePan = true;
    this.controls.enableRotate = !isFlat;
    this.controls.maxDistance = isFlat
      ? Math.max(expandedControlsMaxDistance, this.getExpandedCameraDistance() * 1.5)
      : sphereControlsMaxDistance;
    this.controls.screenSpacePanning = true;
    this.controls.mouseButtons = {
      LEFT: isFlat ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = {
      ONE: isFlat ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
  }

  private clearGeoMapBackdropFrame() {
    if (!this.geoMapBackdropFrameStyle) {
      return;
    }

    this.geoMapBackdropFrameStyle = undefined;
    this.container.style.removeProperty('--process-flow-geo-map-left');
    this.container.style.removeProperty('--process-flow-geo-map-top');
    this.container.style.removeProperty('--process-flow-geo-map-width');
    this.container.style.removeProperty('--process-flow-geo-map-height');
  }

  private updateGeoMapBackdropFrame() {
    const frame = this.data.geoMapFrame;

    if (this.layoutMode !== 'geoMap2d' || !frame) {
      this.clearGeoMapBackdropFrame();
      return;
    }

    const viewportWidth = this.renderer.domElement.clientWidth || this.container.clientWidth;
    const viewportHeight = this.renderer.domElement.clientHeight || this.container.clientHeight;

    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return;
    }

    const halfWidth = frame.width / 2;
    const halfHeight = frame.height / 2;
    const corners = this.geoMapProjectionCorners;
    corners[0].set(-halfWidth, halfHeight, 0);
    corners[1].set(halfWidth, halfHeight, 0);
    corners[2].set(halfWidth, -halfHeight, 0);
    corners[3].set(-halfWidth, -halfHeight, 0);

    this.camera.updateMatrixWorld();

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const corner of corners) {
      corner.project(this.camera);
      if (!Number.isFinite(corner.x) || !Number.isFinite(corner.y)) {
        this.clearGeoMapBackdropFrame();
        return;
      }

      const screenX = ((corner.x + 1) / 2) * viewportWidth;
      const screenY = ((1 - corner.y) / 2) * viewportHeight;
      minX = Math.min(minX, screenX);
      maxX = Math.max(maxX, screenX);
      minY = Math.min(minY, screenY);
      maxY = Math.max(maxY, screenY);
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxY) ||
      maxX <= minX ||
      maxY <= minY
    ) {
      this.clearGeoMapBackdropFrame();
      return;
    }

    const nextFrameStyle = [
      minX.toFixed(3),
      minY.toFixed(3),
      (maxX - minX).toFixed(3),
      (maxY - minY).toFixed(3),
    ].join(':');

    if (nextFrameStyle === this.geoMapBackdropFrameStyle) {
      return;
    }

    this.geoMapBackdropFrameStyle = nextFrameStyle;
    this.container.style.setProperty('--process-flow-geo-map-left', `${minX.toFixed(3)}px`);
    this.container.style.setProperty('--process-flow-geo-map-top', `${minY.toFixed(3)}px`);
    this.container.style.setProperty(
      '--process-flow-geo-map-width',
      `${(maxX - minX).toFixed(3)}px`,
    );
    this.container.style.setProperty(
      '--process-flow-geo-map-height',
      `${(maxY - minY).toFixed(3)}px`,
    );
  }

  private attachEvents() {
    this.renderer.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.handlePointerLeave);
    this.renderer.domElement.addEventListener('click', this.handleClick);
  }

  private detachEvents() {
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
  }

  private buildTransitionEffect() {
    const dustPositions = new Float32Array(transitionDustCount * 3);
    const dustColors = new Float32Array(transitionDustCount * 3);
    const dustSizes = new Float32Array(transitionDustCount);

    for (let index = 0; index < transitionDustCount; index += 1) {
      const seed = getTransitionSeed(index);
      const color = transitionDustColors[index % transitionDustColors.length];
      const angle = seed * Math.PI * 2;
      const radius = 120 + getTransitionSeed(index + 31) * 250;

      dustPositions[index * 3] = Math.cos(angle) * radius;
      dustPositions[index * 3 + 1] = (getTransitionSeed(index + 17) - 0.5) * 220;
      dustPositions[index * 3 + 2] = Math.sin(angle) * radius * 0.72;
      writeColor(dustColors, index * 3, color, 1.35);
      dustSizes[index] = 6 + getTransitionSeed(index + 9) * 10;
    }

    const dustPositionAttribute = new THREE.BufferAttribute(dustPositions, 3);
    dustPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.transitionDustGeometry.setAttribute('position', dustPositionAttribute);
    this.transitionDustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
    this.transitionDustGeometry.setAttribute('pointSize', new THREE.BufferAttribute(dustSizes, 1));
    this.transitionDustGeometry.computeBoundingSphere();
    this.transitionDustPoints = new THREE.Points(
      this.transitionDustGeometry,
      createNodePointMaterial(this.pointTexture, 0),
    );

    const ringPositions = new Float32Array((transitionRingSegments + 1) * 3);
    for (let index = 0; index <= transitionRingSegments; index += 1) {
      const angle = (index / transitionRingSegments) * Math.PI * 2;
      const offset = index * 3;

      ringPositions[offset] = Math.cos(angle) * 330;
      ringPositions[offset + 1] = Math.sin(angle) * 88;
      ringPositions[offset + 2] = Math.sin(angle * 2) * 18;
    }
    this.transitionRingGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(ringPositions, 3),
    );
    this.transitionRingGeometry.computeBoundingSphere();
    this.transitionRing = new THREE.Line(
      this.transitionRingGeometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: '#bff9ff',
        depthWrite: false,
        opacity: 0,
        transparent: true,
      }),
    );

    const gateCount = 13;
    const gatePositions = new Float32Array(gateCount * 6);
    const gateColors = new Float32Array(gateCount * 6);
    for (let index = 0; index < gateCount; index += 1) {
      const angle = (index / gateCount) * Math.PI * 2;
      const radius = 172 + getTransitionSeed(index + 55) * 130;
      const height = 42 + getTransitionSeed(index + 71) * 94;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 0.55;
      const bottomY = -210 + getTransitionSeed(index + 88) * 36;
      const offset = index * 6;
      const color = transitionDustColors[(index + 1) % transitionDustColors.length];

      gatePositions[offset] = x;
      gatePositions[offset + 1] = bottomY;
      gatePositions[offset + 2] = z;
      gatePositions[offset + 3] = x;
      gatePositions[offset + 4] = bottomY + height;
      gatePositions[offset + 5] = z;
      writeColor(gateColors, offset, color, 0.15);
      writeColor(gateColors, offset + 3, color, 1.35);
    }
    this.transitionGateGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(gatePositions, 3),
    );
    this.transitionGateGeometry.setAttribute('color', new THREE.BufferAttribute(gateColors, 3));
    this.transitionGateGeometry.computeBoundingSphere();
    this.transitionGateLines = new THREE.LineSegments(
      this.transitionGateGeometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
        transparent: true,
        vertexColors: true,
      }),
    );

    const projectionVertexCount = projectionGridLineCount * projectionGridSegments * 2;
    const projectionPositions = new Float32Array(projectionVertexCount * 3);
    const projectionColors = new Float32Array(projectionVertexCount * 3);
    const projectionPositionAttribute = new THREE.BufferAttribute(projectionPositions, 3);
    projectionPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    for (let index = 0; index < projectionVertexCount; index += 1) {
      const color = transitionDustColors[index % transitionDustColors.length];
      writeColor(projectionColors, index * 3, color, index % 2 === 0 ? 0.72 : 1.28);
    }
    this.transitionProjectionGeometry.setAttribute('position', projectionPositionAttribute);
    this.transitionProjectionGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(projectionColors, 3),
    );
    this.transitionProjectionGeometry.computeBoundingSphere();
    this.transitionProjectionLines = new THREE.LineSegments(
      this.transitionProjectionGeometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
        transparent: true,
        vertexColors: true,
      }),
    );

    this.transitionEffectGroup.visible = false;
    this.transitionEffectGroup.add(this.transitionDustPoints);
    this.transitionEffectGroup.add(this.transitionRing);
    this.transitionEffectGroup.add(this.transitionGateLines);
    this.transitionEffectGroup.add(this.transitionProjectionLines);
  }

  private buildScene() {
    this.group.clear();
    this.nodeGeometry.dispose();
    this.edgeGeometry.dispose();
    this.highlightedNodeGeometry.dispose();
    this.highlightedEdgeGeometry.dispose();
    this.flowMarkerGeometry.dispose();
    this.selectedNodeGeometry.dispose();
    this.sphereShell?.geometry.dispose();
    if (this.sphereShell?.material instanceof THREE.Material) {
      this.sphereShell.material.dispose();
    }
    this.nodeGeometry = new THREE.BufferGeometry();
    this.edgeGeometry = new THREE.BufferGeometry();
    this.highlightedNodeGeometry = new THREE.BufferGeometry();
    this.highlightedEdgeGeometry = new THREE.BufferGeometry();
    this.flowMarkerGeometry = new THREE.BufferGeometry();
    this.selectedNodeGeometry = new THREE.BufferGeometry();
    this.sphereShell = createSphereShell();

    this.buildNodeGeometry();
    this.buildEdgeGeometry();

    this.edgeLines = new THREE.LineSegments(
      this.edgeGeometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.2,
        transparent: true,
        vertexColors: true,
      }),
    );
    this.nodePoints = new THREE.Points(
      this.nodeGeometry,
      createNodePointMaterial(this.pointTexture, 0.84),
    );
    this.highlightedEdgeLines = new THREE.LineSegments(
      this.highlightedEdgeGeometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.95,
        transparent: true,
        vertexColors: true,
      }),
    );
    this.flowMarkerLines = new THREE.LineSegments(
      this.flowMarkerGeometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
        transparent: true,
        vertexColors: true,
      }),
    );
    this.highlightedNodePoints = new THREE.Points(
      this.highlightedNodeGeometry,
      createNodePointMaterial(this.pointTexture, 0.98),
    );
    this.selectedNodePoint = new THREE.Points(
      this.selectedNodeGeometry,
      new THREE.PointsMaterial({
        alphaTest: 0.02,
        blending: THREE.AdditiveBlending,
        color: '#23f4ff',
        depthWrite: false,
        map: this.pointTexture,
        opacity: 0.98,
        size: this.getSelectedNodePulseBaseSize(),
        sizeAttenuation: true,
        transparent: true,
      }),
    );

    this.group.add(this.sphereShell);
    this.group.add(this.edgeLines);
    this.group.add(this.nodePoints);
    this.group.add(this.highlightedEdgeLines);
    this.group.add(this.flowMarkerLines);
    this.group.add(this.highlightedNodePoints);
    this.group.add(this.selectedNodePoint);
    this.updateHighlightedGeometry();
    this.updateMaterialState();
  }

  private buildNodeGeometry() {
    const positions = new Float32Array(this.data.nodes.length * 3);
    const colors = new Float32Array(this.data.nodes.length * 3);
    const sizes = new Float32Array(this.data.nodes.length);

    this.data.nodes.forEach((node, index) => {
      writeTuple(positions, index * 3, getNodePosition(this.data, this.layoutMode, node.id));
      writeColor(
        colors,
        index * 3,
        this.getClusterColor(node),
        node.kind === 'process' ? 0.92 : 1.16,
      );
      sizes[index] = getNodePointSize(node, this.layoutMode);
    });

    const positionAttribute = new THREE.BufferAttribute(positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.nodeGeometry.setAttribute('position', positionAttribute);
    this.nodeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.nodeGeometry.setAttribute('pointSize', new THREE.BufferAttribute(sizes, 1));
    this.nodeGeometry.computeBoundingSphere();
  }

  private buildEdgeGeometry() {
    const usesOverviewEdgeTreatment =
      this.layoutMode === 'sphere3d' || isExpandedLikeLayout(this.layoutMode);
    const segmentCount = this.layoutMode === 'sphere3d' ? sphereEdgeSegments : 1;
    const edgeRenders = this.getBaseEdgeRenders();
    const positions = new Float32Array(edgeRenders.length * segmentCount * 6);
    const colors = new Float32Array(edgeRenders.length * segmentCount * 6);
    let offset = 0;

    edgeRenders.forEach(({ edge, intensityScale }) => {
      const hasSelection = Boolean(this.selection.selectedNodeId);
      const source = getNodePosition(this.data, this.layoutMode, edge.source);
      const target = getNodePosition(this.data, this.layoutMode, edge.target);
      const mutedSource =
        usesOverviewEdgeTreatment || hasSelection
          ? getNodePosition(this.data, 'sphere3d', edge.source)
          : source;
      const mutedTarget =
        usesOverviewEdgeTreatment || hasSelection
          ? getNodePosition(this.data, 'sphere3d', edge.target)
          : target;
      const color =
        hasSelection || usesOverviewEdgeTreatment
          ? this.getSphereBaseEdgeColor(edge)
          : getEdgeColor(edge.direction);
      const intensity =
        hasSelection || usesOverviewEdgeTreatment
          ? this.getSphereBaseEdgeIntensity(edge, mutedSource, mutedTarget)
          : 0.38;
      const scaledIntensity = intensity * intensityScale;

      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const startProgress = segmentIndex / segmentCount;
        const endProgress = (segmentIndex + 1) / segmentCount;
        const start =
          this.layoutMode === 'sphere3d'
            ? getSphereArcPoint(source, target, startProgress, sphereSurfaceLift)
            : source;
        const end =
          this.layoutMode === 'sphere3d'
            ? getSphereArcPoint(source, target, endProgress, sphereSurfaceLift)
            : target;

        writeTuple(positions, offset, start);
        writeTuple(positions, offset + 3, end);
        writeColor(colors, offset, color, scaledIntensity);
        writeColor(colors, offset + 3, color, scaledIntensity);
        offset += 6;
      }
    });

    this.edgeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.edgeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.edgeGeometry.computeBoundingSphere();
  }

  private getBaseEdgeRenders(): BaseEdgeRender[] {
    if (!shouldRenderProcessFlowBaseEdges(this.layoutMode, this.selection)) {
      return [];
    }

    const hasSelection = Boolean(this.selection.selectedNodeId);

    if (hasSelection) {
      return this.data.edges.map((edge) => ({ edge, intensityScale: 0.72 }));
    }

    return this.data.edges
      .map((edge, index) => {
        const sourceNode = this.getNode(edge.source);
        const targetNode = this.getNode(edge.target);
        const isCrossCluster =
          Boolean(sourceNode && targetNode) &&
          sourceNode?.clusterIdLevel1 !== targetNode?.clusterIdLevel1;
        const degreeScore = (sourceNode?.degree ?? 0) + (targetNode?.degree ?? 0);
        const processScore =
          sourceNode?.kind === 'process' || targetNode?.kind === 'process' ? 42 : 0;
        const hashScore = getStableHash(`${edge.id}:${index}`) / 0xffff_ffff;
        const score = (isCrossCluster ? 900 : 0) + degreeScore + processScore + hashScore;

        return { edge, score };
      })
      .sort((left, right) => right.score - left.score)
      .map(({ edge }) => ({
        edge,
        intensityScale: this.layoutMode === 'sphere3d' ? 0.34 : 0.28,
      }));
  }

  private getNode(nodeId: string) {
    const nodeIndex = this.data.indexes.nodeById[nodeId];

    return nodeIndex === undefined ? undefined : this.data.nodes[nodeIndex];
  }

  private getClusterColor(node: ProcessFlowGraphNode): THREE.Color {
    return this.clusterColors.get(node.clusterIdLevel1)?.clone() ?? new THREE.Color('#8da2b3');
  }

  private getSphereBaseEdgeColor(edge: ProcessFlowGraphEdge) {
    const sourceNode = this.getNode(edge.source);
    const targetNode = this.getNode(edge.target);

    if (this.selection.selectedNodeId) {
      return sphereMutedEdgeColor;
    }

    if (!sourceNode || !targetNode) {
      return getEdgeColor(edge.direction);
    }

    if (sourceNode.clusterIdLevel1 === targetNode.clusterIdLevel1) {
      return this.getClusterColor(sourceNode.kind === 'flow' ? sourceNode : targetNode);
    }

    return this.getClusterColor(sourceNode)
      .lerp(this.getClusterColor(targetNode), 0.5)
      .lerp(mutedColor, 0.22);
  }

  private getSphereBaseEdgeIntensity(
    edge: ProcessFlowGraphEdge,
    source: [number, number, number],
    target: [number, number, number],
  ) {
    const sourceNode = this.getNode(edge.source);
    const targetNode = this.getNode(edge.target);
    const sameCluster = sourceNode?.clusterIdLevel1 === targetNode?.clusterIdLevel1;
    const directionDot = Math.max(-1, Math.min(1, getTupleDot(source, target)));
    const localFactor = 0.22 + Math.pow((directionDot + 1) / 2, 3) * 0.78;

    if (this.selection.selectedNodeId) {
      return (sameCluster ? 0.72 : 0.46) * localFactor;
    }

    return (sameCluster ? 0.34 : 0.13) * localFactor;
  }

  private updateMaterialState() {
    const hasSelection = Boolean(this.selection.selectedNodeId);
    const isSphere = this.layoutMode === 'sphere3d';
    const shouldRenderBaseEdges = shouldRenderProcessFlowBaseEdges(this.layoutMode, this.selection);
    const selectedEdgeBrightnessScale = hasSelection
      ? getSelectedEdgeBrightnessScale(this.selection.highlightedEdgeIds.size)
      : 1;
    const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
    const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const flowMarkerMaterial = this.flowMarkerLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const nodeMaterial = this.nodePoints?.material;
    const highlightedNodeMaterial = this.highlightedNodePoints?.material;
    const selectedNodeMaterial = this.selectedNodePoint?.material as
      | THREE.PointsMaterial
      | undefined;

    if (this.sphereShell) {
      this.sphereShell.visible = false;
    }

    if (this.edgeLines) {
      this.edgeLines.visible = shouldRenderBaseEdges;
    }
    if (edgeMaterial) {
      edgeMaterial.opacity = shouldRenderBaseEdges
        ? isSphere || isExpandedLikeLayout(this.layoutMode)
          ? hasSelection
            ? 0.02
            : 0.032
          : hasSelection
            ? 0.06
            : 0.09
        : 0;
    }
    setLineMaterialOpacity(
      highlightedEdgeMaterial,
      (hasSelection && (isSphere || isExpandedLikeLayout(this.layoutMode)) ? 0.42 : 0.9) *
        selectedEdgeBrightnessScale,
    );
    if (flowMarkerMaterial) {
      flowMarkerMaterial.opacity = hasSelection
        ? flowMarkerOpacity * selectedEdgeBrightnessScale
        : 0;
    }
    if (nodeMaterial instanceof THREE.ShaderMaterial) {
      nodeMaterial.uniforms.opacity.value = getNodeMaterialOpacity(this.layoutMode, hasSelection);
      nodeMaterial.uniforms.backsideFade.value = getNodeBacksideFade(this.layoutMode, hasSelection);
    }
    if (highlightedNodeMaterial instanceof THREE.ShaderMaterial) {
      highlightedNodeMaterial.uniforms.opacity.value = 1;
      highlightedNodeMaterial.uniforms.backsideFade.value = 0;
    }
    if (selectedNodeMaterial) {
      const selectedNode = this.selection.selectedNodeId
        ? this.getNode(this.selection.selectedNodeId)
        : undefined;

      if (selectedNode) {
        selectedNodeMaterial.color.copy(this.getClusterColor(selectedNode));
      }
      selectedNodeMaterial.size = this.getSelectedNodePulseBaseSize();
      selectedNodeMaterial.opacity = hasSelection ? selectedNodePulseMaxOpacity : 0;
    }
    this.updateSelectedNodePulse();
  }

  private finishLayoutTransition(applyTarget: boolean) {
    const transition = this.transition;

    if (transition && applyTarget) {
      if (transition.deferredLayoutMode) {
        this.layoutMode = transition.deferredLayoutMode;
        this.updateControlInteractionMode();
        this.group.rotation.set(0, 0, 0);
        this.buildScene();
      } else {
        setGeometryPositionArray(this.nodeGeometry, transition.nodeTo);
        setGeometryPositionArray(this.highlightedNodeGeometry, transition.highlightedNodeTo);
        setGeometryPositionArray(this.selectedNodeGeometry, transition.selectedNodeTo);
      }
      this.camera.position.copy(transition.cameraTo);
      this.controls.target.copy(transition.targetTo);
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }

    this.transition = undefined;
    this.controls.enabled = !this.sphereSelectionTransition;
    this.transitionEffectGroup.visible = false;
    this.updateTransitionEffectOpacity(0);

    if (applyTarget) {
      this.updateMaterialState();
    }
  }

  private finishCameraFocusTransition(applyTarget: boolean) {
    const transition = this.cameraFocusTransition;

    if (transition && applyTarget) {
      this.camera.position.copy(transition.cameraTo);
      this.controls.target.copy(transition.targetTo);
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }

    this.cameraFocusTransition = undefined;
    if (!this.transition && !this.sphereSelectionTransition) {
      this.controls.enabled = true;
    }
  }

  private focusCameraFrame(frame: CameraFrame) {
    this.cameraFocusTransition = {
      cameraFrom: this.camera.position.clone(),
      cameraTo: frame.position,
      duration: cameraFocusDurationMs,
      startedAt: performance.now(),
      targetFrom: this.controls.target.clone(),
      targetTo: frame.target,
    };
    this.controls.enabled = false;
    this.updateCameraFocusTransition(0);
  }

  private getRenderedNodePosition(nodeId: string) {
    const [x, y, z] = getNodePosition(this.data, this.layoutMode, nodeId);

    return new THREE.Vector3(x, y, z).applyEuler(this.group.rotation);
  }

  private getSphereSelectionCameraFrame(nodeId: string): CameraFrame {
    const selectedPosition = this.getRenderedNodePosition(nodeId);
    const cameraDirection = this.camera.position.clone().sub(this.controls.target);
    const currentDistance = Math.max(1, cameraDirection.length());

    if (cameraDirection.lengthSq() < 0.0001) {
      cameraDirection.set(0, 0, 1);
    } else {
      cameraDirection.normalize();
    }

    const target = selectedPosition.multiplyScalar(0.14);
    const distance = THREE.MathUtils.clamp(currentDistance * 0.94, 900, sphereControlsMaxDistance);

    return {
      position: target.clone().addScaledVector(cameraDirection, distance),
      target,
    };
  }

  private startSphereSelectionTransition({
    edgeOpacityFrom,
    flowMarkerOpacityFrom,
    highlightedEdgeOpacityFrom,
    highlightedNodeOpacityFrom,
    selectedNodeFrom,
    selectedNodeId,
  }: {
    edgeOpacityFrom: number;
    flowMarkerOpacityFrom: number;
    highlightedEdgeOpacityFrom: number;
    highlightedNodeOpacityFrom: number;
    selectedNodeFrom: Float32Array;
    selectedNodeId: string;
  }) {
    const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
    const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const flowMarkerMaterial = this.flowMarkerLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const highlightedNodeMaterial = this.highlightedNodePoints?.material;
    const selectedNodeTo = capturePositionArray(this.selectedNodeGeometry);
    const normalizedSelectedNodeFrom =
      selectedNodeFrom.length === selectedNodeTo.length ? selectedNodeFrom : selectedNodeTo;
    const frameTo = this.getSphereSelectionCameraFrame(selectedNodeId);

    this.selectedNodeRevealProgress = 0;
    setGeometryPositionArray(this.selectedNodeGeometry, normalizedSelectedNodeFrom);
    this.sphereSelectionTransition = {
      cameraFrom: this.camera.position.clone(),
      cameraTo: frameTo.position,
      duration: sphereSelectionTransitionDurationMs,
      edgeOpacityFrom,
      edgeOpacityTo: edgeMaterial?.opacity ?? edgeOpacityFrom,
      flowMarkerOpacityFrom,
      flowMarkerOpacityTo: flowMarkerMaterial?.opacity ?? flowMarkerOpacityFrom,
      highlightedEdgeOpacityFrom,
      highlightedEdgeOpacityTo:
        getLineMaterialOpacity(highlightedEdgeMaterial) ?? highlightedEdgeOpacityFrom,
      highlightedNodeOpacityFrom,
      highlightedNodeOpacityTo:
        highlightedNodeMaterial instanceof THREE.ShaderMaterial
          ? highlightedNodeMaterial.uniforms.opacity.value
          : highlightedNodeOpacityFrom,
      selectedNodeFrom: normalizedSelectedNodeFrom,
      selectedNodeTo,
      startedAt: performance.now(),
      targetFrom: this.controls.target.clone(),
      targetTo: frameTo.target,
    };
    this.controls.enabled = false;
    this.updateSphereSelectionTransition(0);
  }

  private startFlatSelectionTransition({
    edgeOpacityFrom,
    flowMarkerOpacityFrom,
    highlightedEdgeOpacityFrom,
    highlightedNodeOpacityFrom,
    selectedNodeFrom,
  }: {
    edgeOpacityFrom: number;
    flowMarkerOpacityFrom: number;
    highlightedEdgeOpacityFrom: number;
    highlightedNodeOpacityFrom: number;
    selectedNodeFrom: Float32Array;
  }) {
    const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
    const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const flowMarkerMaterial = this.flowMarkerLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const highlightedNodeMaterial = this.highlightedNodePoints?.material;
    const selectedNodeTo = capturePositionArray(this.selectedNodeGeometry);
    const normalizedSelectedNodeFrom =
      selectedNodeFrom.length === selectedNodeTo.length ? selectedNodeFrom : selectedNodeTo;
    const currentCameraPosition = this.camera.position.clone();
    const currentTarget = this.controls.target.clone();

    this.selectedNodeRevealProgress = 0;
    setGeometryPositionArray(this.selectedNodeGeometry, normalizedSelectedNodeFrom);
    this.sphereSelectionTransition = {
      cameraFrom: currentCameraPosition,
      cameraTo: currentCameraPosition.clone(),
      duration: flatSelectionTransitionDurationMs,
      edgeOpacityFrom,
      edgeOpacityTo: edgeMaterial?.opacity ?? edgeOpacityFrom,
      flowMarkerOpacityFrom: 0,
      flowMarkerOpacityTo: flowMarkerMaterial?.opacity ?? flowMarkerOpacityFrom,
      highlightedEdgeOpacityFrom: 0,
      highlightedEdgeOpacityTo:
        getLineMaterialOpacity(highlightedEdgeMaterial) ?? highlightedEdgeOpacityFrom,
      highlightedNodeOpacityFrom: 0,
      highlightedNodeOpacityTo:
        highlightedNodeMaterial instanceof THREE.ShaderMaterial
          ? highlightedNodeMaterial.uniforms.opacity.value
          : highlightedNodeOpacityFrom,
      isFlatSelection: true,
      selectedNodeFrom: normalizedSelectedNodeFrom,
      selectedNodeTo,
      startedAt: performance.now(),
      targetFrom: currentTarget,
      targetTo: currentTarget.clone(),
    };
    this.controls.enabled = false;
    this.updateSphereSelectionTransition(0);
  }

  private finishSphereSelectionTransition(applyTarget: boolean) {
    const transition = this.sphereSelectionTransition;

    if (transition && applyTarget) {
      this.camera.position.copy(transition.cameraTo);
      this.controls.target.copy(transition.targetTo);
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }

    this.sphereSelectionTransition = undefined;
    this.selectedNodeRevealProgress = 1;
    if (applyTarget) {
      this.updateMaterialState();
    }
    if (!this.transition && !this.cameraFocusTransition) {
      this.controls.enabled = true;
    }
  }

  private updateSphereSelectionTransition(forcedProgress?: number) {
    const transition = this.sphereSelectionTransition;

    if (!transition) {
      return;
    }

    const rawProgress =
      forcedProgress ??
      THREE.MathUtils.clamp((performance.now() - transition.startedAt) / transition.duration, 0, 1);
    const isFlatSelection = transition.isFlatSelection === true;
    const cameraProgress = getFairyEase(rawProgress);
    const highlightProgress = isFlatSelection
      ? getSmoothStep(0, 0.86, rawProgress)
      : getSmoothStep(0.08, 1, rawProgress);
    const markerProgress = isFlatSelection
      ? getSmoothStep(0.12, 1, rawProgress)
      : getSmoothStep(0.32, 1, rawProgress);
    const nodeProgress = isFlatSelection
      ? getSmoothStep(0, 0.46, rawProgress)
      : getSmoothStep(0, 0.7, rawProgress);
    const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
    const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const flowMarkerMaterial = this.flowMarkerLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const highlightedNodeMaterial = this.highlightedNodePoints?.material;
    const selectedNodePositionAttribute = this.selectedNodeGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    this.camera.position.lerpVectors(transition.cameraFrom, transition.cameraTo, cameraProgress);
    this.controls.target.lerpVectors(transition.targetFrom, transition.targetTo, cameraProgress);
    this.camera.updateProjectionMatrix();

    if (
      selectedNodePositionAttribute &&
      transition.selectedNodeFrom.length === transition.selectedNodeTo.length &&
      selectedNodePositionAttribute.array.length === transition.selectedNodeFrom.length
    ) {
      const selectedPositions = selectedNodePositionAttribute.array as Float32Array;
      for (let offset = 0; offset < selectedPositions.length; offset += 3) {
        selectedPositions[offset] = THREE.MathUtils.lerp(
          transition.selectedNodeFrom[offset],
          transition.selectedNodeTo[offset],
          cameraProgress,
        );
        selectedPositions[offset + 1] = THREE.MathUtils.lerp(
          transition.selectedNodeFrom[offset + 1],
          transition.selectedNodeTo[offset + 1],
          cameraProgress,
        );
        selectedPositions[offset + 2] = THREE.MathUtils.lerp(
          transition.selectedNodeFrom[offset + 2],
          transition.selectedNodeTo[offset + 2],
          cameraProgress,
        );
      }
      selectedNodePositionAttribute.needsUpdate = true;
      this.selectedNodeGeometry.computeBoundingSphere();
    }

    if (edgeMaterial) {
      edgeMaterial.opacity = THREE.MathUtils.lerp(
        transition.edgeOpacityFrom,
        transition.edgeOpacityTo,
        highlightProgress,
      );
    }
    setLineMaterialOpacity(
      highlightedEdgeMaterial,
      THREE.MathUtils.lerp(
        transition.highlightedEdgeOpacityFrom,
        transition.highlightedEdgeOpacityTo,
        highlightProgress,
      ),
    );
    if (flowMarkerMaterial) {
      flowMarkerMaterial.opacity = THREE.MathUtils.lerp(
        transition.flowMarkerOpacityFrom,
        transition.flowMarkerOpacityTo,
        markerProgress,
      );
    }
    if (highlightedNodeMaterial instanceof THREE.ShaderMaterial) {
      highlightedNodeMaterial.uniforms.opacity.value = THREE.MathUtils.lerp(
        transition.highlightedNodeOpacityFrom,
        transition.highlightedNodeOpacityTo,
        nodeProgress,
      );
    }
    this.selectedNodeRevealProgress = nodeProgress;
    this.updateSelectedNodePulse();

    if (rawProgress >= 1) {
      this.finishSphereSelectionTransition(true);
    }
  }

  private updateCameraFocusTransition(forcedProgress?: number) {
    const transition = this.cameraFocusTransition;

    if (!transition) {
      return;
    }

    const rawProgress =
      forcedProgress ??
      THREE.MathUtils.clamp((performance.now() - transition.startedAt) / transition.duration, 0, 1);
    const easedProgress = getFairyEase(rawProgress);

    this.camera.position.lerpVectors(transition.cameraFrom, transition.cameraTo, easedProgress);
    this.controls.target.lerpVectors(transition.targetFrom, transition.targetTo, easedProgress);
    this.camera.updateProjectionMatrix();

    if (rawProgress >= 1) {
      this.finishCameraFocusTransition(true);
    }
  }

  private updateLayoutTransition(forcedProgress?: number) {
    const transition = this.transition;

    if (!transition) {
      return;
    }

    const rawProgress =
      forcedProgress ??
      THREE.MathUtils.clamp((performance.now() - transition.startedAt) / transition.duration, 0, 1);
    const easedProgress = getFairyEase(rawProgress);

    this.applyMorphPositions(
      this.nodeGeometry,
      transition.nodeFrom,
      transition.nodeTo,
      easedProgress,
      rawProgress,
      0,
      transition,
    );
    this.applyMorphPositions(
      this.highlightedNodeGeometry,
      transition.highlightedNodeFrom,
      transition.highlightedNodeTo,
      easedProgress,
      rawProgress,
      2000,
      transition,
    );
    this.applyMorphPositions(
      this.selectedNodeGeometry,
      transition.selectedNodeFrom,
      transition.selectedNodeTo,
      easedProgress,
      rawProgress,
      4000,
      transition,
    );
    if (isSphereExpandedTransition(transition)) {
      const forwardProgress = getSphereExpandedForwardProgress(rawProgress, transition);
      const cameraProgress = getFairyEase(forwardProgress);
      const sphereCamera = isExpandedToSphereTransition(transition)
        ? transition.cameraTo
        : transition.cameraFrom;
      const expandedCamera = isExpandedToSphereTransition(transition)
        ? transition.cameraFrom
        : transition.cameraTo;
      const sphereTarget = isExpandedToSphereTransition(transition)
        ? transition.targetTo
        : transition.targetFrom;
      const expandedTarget = isExpandedToSphereTransition(transition)
        ? transition.targetFrom
        : transition.targetTo;

      this.camera.position.lerpVectors(sphereCamera, expandedCamera, cameraProgress);
      this.controls.target.lerpVectors(sphereTarget, expandedTarget, cameraProgress);
    } else if (isGeoProjectionTransition(transition)) {
      const forwardProgress = getGeoProjectionForwardProgress(rawProgress, transition);
      const cameraProgress = getFairyEase(forwardProgress);
      const sphereCamera = isGeoMapToSphereTransition(transition)
        ? transition.cameraTo
        : transition.cameraFrom;
      const mapCamera = isGeoMapToSphereTransition(transition)
        ? transition.cameraFrom
        : transition.cameraTo;
      const sphereTarget = isGeoMapToSphereTransition(transition)
        ? transition.targetTo
        : transition.targetFrom;
      const mapTarget = isGeoMapToSphereTransition(transition)
        ? transition.targetFrom
        : transition.targetTo;

      this.camera.position.lerpVectors(sphereCamera, mapCamera, cameraProgress);
      this.controls.target.lerpVectors(sphereTarget, mapTarget, cameraProgress);
    } else if (isExpandedGeoMapTransition(transition)) {
      const forwardProgress = getExpandedGeoMapForwardProgress(rawProgress, transition);
      const cameraProgress = getFairyEase(forwardProgress);
      const expandedCamera = isGeoMapToExpandedTransition(transition)
        ? transition.cameraTo
        : transition.cameraFrom;
      const mapCamera = isGeoMapToExpandedTransition(transition)
        ? transition.cameraFrom
        : transition.cameraTo;
      const expandedTarget = isGeoMapToExpandedTransition(transition)
        ? transition.targetTo
        : transition.targetFrom;
      const mapTarget = isGeoMapToExpandedTransition(transition)
        ? transition.targetFrom
        : transition.targetTo;

      this.camera.position.lerpVectors(expandedCamera, mapCamera, cameraProgress);
      this.controls.target.lerpVectors(expandedTarget, mapTarget, cameraProgress);
    } else {
      this.camera.position.lerpVectors(transition.cameraFrom, transition.cameraTo, easedProgress);
      this.controls.target.lerpVectors(transition.targetFrom, transition.targetTo, easedProgress);
    }
    this.camera.updateProjectionMatrix();
    this.updateTransitionMaterialState(rawProgress);
    this.updateFairyTransitionEffect(rawProgress, transition);

    if (rawProgress >= 1) {
      this.finishLayoutTransition(true);
    }
  }

  private applyMorphPositions(
    geometry: THREE.BufferGeometry,
    from: Float32Array,
    to: Float32Array,
    easedProgress: number,
    rawProgress: number,
    seedOffset: number,
    transition: LayoutTransition,
  ) {
    const positionAttribute = geometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    if (
      !positionAttribute ||
      from.length !== to.length ||
      positionAttribute.array.length !== from.length
    ) {
      return;
    }

    const positionArray = positionAttribute.array as Float32Array;

    if (isSphereExpandedTransition(transition)) {
      this.applySphereExpandedMorphPositions(
        positionArray,
        from,
        to,
        rawProgress,
        seedOffset,
        transition,
      );
      positionAttribute.needsUpdate = true;
      geometry.computeBoundingSphere();
      return;
    }

    if (isGeoProjectionTransition(transition)) {
      this.applyProjectionMorphPositions(
        positionArray,
        from,
        to,
        rawProgress,
        seedOffset,
        transition,
      );
      positionAttribute.needsUpdate = true;
      geometry.computeBoundingSphere();
      return;
    }

    if (isExpandedGeoMapTransition(transition)) {
      this.applyPlanarMapMorphPositions(
        positionArray,
        from,
        to,
        rawProgress,
        seedOffset,
        transition,
      );
      positionAttribute.needsUpdate = true;
      geometry.computeBoundingSphere();
      return;
    }

    if (isGeoMapScopeTransition(transition)) {
      this.applyGeoMapZoomMorphPositions(
        positionArray,
        from,
        to,
        rawProgress,
        seedOffset,
        transition,
      );
      positionAttribute.needsUpdate = true;
      geometry.computeBoundingSphere();
      return;
    }

    const sparkle = Math.sin(Math.PI * rawProgress);
    const modeScale = this.layoutMode === 'sphere3d' ? 1.04 : 0.78;

    for (let offset = 0; offset < positionArray.length; offset += 3) {
      const vertexIndex = offset / 3 + seedOffset;
      const seed = getTransitionSeed(vertexIndex);
      const waveAngle = seed * Math.PI * 8 + rawProgress * Math.PI * 2.4;
      const xDrift = Math.sin(waveAngle) * sparkle * (5 + seed * 10) * modeScale;
      const yLift = sparkle * (18 + seed * 34);
      const zDrift = Math.cos(waveAngle * 1.27) * sparkle * (10 + seed * 18) * modeScale;

      positionArray[offset] =
        THREE.MathUtils.lerp(from[offset], to[offset], easedProgress) + xDrift;
      positionArray[offset + 1] =
        THREE.MathUtils.lerp(from[offset + 1], to[offset + 1], easedProgress) + yLift;
      positionArray[offset + 2] =
        THREE.MathUtils.lerp(from[offset + 2], to[offset + 2], easedProgress) + zDrift;
    }

    positionAttribute.needsUpdate = true;
    geometry.computeBoundingSphere();
  }

  private applySphereExpandedMorphPositions(
    positionArray: Float32Array,
    from: Float32Array,
    to: Float32Array,
    rawProgress: number,
    seedOffset: number,
    transition: LayoutTransition,
  ) {
    const forwardProgress = getSphereExpandedForwardProgress(rawProgress, transition);
    const easedProgress = getFairyEase(forwardProgress);
    const sparkle = Math.sin(Math.PI * forwardProgress);
    const sphere = isExpandedToSphereTransition(transition) ? to : from;
    const expanded = isExpandedToSphereTransition(transition) ? from : to;
    const modeScale = 0.78;

    for (let offset = 0; offset < positionArray.length; offset += 3) {
      const vertexIndex = offset / 3 + seedOffset;
      const seed = getTransitionSeed(vertexIndex);
      const waveAngle = seed * Math.PI * 8 + forwardProgress * Math.PI * 2.4;
      const xDrift = Math.sin(waveAngle) * sparkle * (5 + seed * 10) * modeScale;
      const yLift = sparkle * (18 + seed * 34);
      const zDrift = Math.cos(waveAngle * 1.27) * sparkle * (10 + seed * 18) * modeScale;

      positionArray[offset] =
        THREE.MathUtils.lerp(sphere[offset], expanded[offset], easedProgress) + xDrift;
      positionArray[offset + 1] =
        THREE.MathUtils.lerp(sphere[offset + 1], expanded[offset + 1], easedProgress) + yLift;
      positionArray[offset + 2] =
        THREE.MathUtils.lerp(sphere[offset + 2], expanded[offset + 2], easedProgress) + zDrift;
    }
  }

  private applyProjectionMorphPositions(
    positionArray: Float32Array,
    from: Float32Array,
    to: Float32Array,
    rawProgress: number,
    seedOffset: number,
    transition: LayoutTransition,
  ) {
    const forwardProgress = getGeoProjectionForwardProgress(rawProgress, transition);
    const projectionProgress = getFairyEase(forwardProgress);
    const flattenProgress = getSmoothStep(0.04, 0.58, forwardProgress);
    const flare = Math.sin(Math.PI * forwardProgress);
    const sphere = isGeoMapToSphereTransition(transition) ? to : from;
    const map = isGeoMapToSphereTransition(transition) ? from : to;

    for (let offset = 0; offset < positionArray.length; offset += 3) {
      const vertexIndex = offset / 3 + seedOffset;
      const seed = getTransitionSeed(vertexIndex);
      const landingProgress = getFairyEase(
        THREE.MathUtils.clamp((forwardProgress - seed * 0.13) / 0.87, 0, 1),
      );
      const sourceX = sphere[offset];
      const sourceY = sphere[offset + 1];
      const sourceZ = sphere[offset + 2];
      const flattenedX = sourceX * (1 + flattenProgress * 0.22);
      const flattenedY = sourceY * (1 - flattenProgress * 0.1);
      const flattenedZ = sourceZ * (1 - flattenProgress * 0.94);
      const waveAngle = seed * Math.PI * 10 + forwardProgress * Math.PI * 3.2;
      const scanLift = flare * (24 + seed * 42);
      const sidewaysDrift = Math.sin(waveAngle) * flare * (8 + seed * 14);
      const depthDrift = Math.cos(waveAngle * 1.21) * flare * (18 + seed * 36);
      const settle = getSmoothStep(0.72, 1, forwardProgress);

      positionArray[offset] =
        THREE.MathUtils.lerp(flattenedX, map[offset], landingProgress) +
        sidewaysDrift * (1 - settle);
      positionArray[offset + 1] =
        THREE.MathUtils.lerp(flattenedY, map[offset + 1], landingProgress) +
        scanLift * (1 - settle);
      positionArray[offset + 2] =
        THREE.MathUtils.lerp(flattenedZ, map[offset + 2], projectionProgress) +
        depthDrift * (1 - settle);
    }
  }

  private applyPlanarMapMorphPositions(
    positionArray: Float32Array,
    from: Float32Array,
    to: Float32Array,
    rawProgress: number,
    seedOffset: number,
    transition: LayoutTransition,
  ) {
    const forwardProgress = getExpandedGeoMapForwardProgress(rawProgress, transition);
    const flare = Math.sin(Math.PI * forwardProgress);
    const routeProgress = getFairyEase(getSmoothStep(0.02, 0.96, forwardProgress));
    const settle = getSmoothStep(0.72, 1, forwardProgress);
    const expanded = isGeoMapToExpandedTransition(transition) ? to : from;
    const map = isGeoMapToExpandedTransition(transition) ? from : to;

    for (let offset = 0; offset < positionArray.length; offset += 3) {
      const vertexIndex = offset / 3 + seedOffset;
      const seed = getTransitionSeed(vertexIndex);
      const sweepProgress = getFairyEase(
        THREE.MathUtils.clamp((forwardProgress - seed * 0.16) / 0.84, 0, 1),
      );
      const pulseAngle =
        seed * Math.PI * 9 +
        forwardProgress * Math.PI * 4 +
        (map[offset] + map[offset + 1]) * 0.003;
      const routeBend = Math.sin(pulseAngle) * flare * (10 + seed * 18) * (1 - settle);
      const scanLift = Math.cos(pulseAngle * 0.72) * flare * (8 + seed * 14) * (1 - settle);

      positionArray[offset] = THREE.MathUtils.lerp(expanded[offset], map[offset], sweepProgress);
      positionArray[offset + 1] =
        THREE.MathUtils.lerp(expanded[offset + 1], map[offset + 1], routeProgress) + routeBend;
      positionArray[offset + 2] =
        THREE.MathUtils.lerp(expanded[offset + 2], map[offset + 2], routeProgress) + scanLift;
    }
  }

  private applyGeoMapZoomMorphPositions(
    positionArray: Float32Array,
    from: Float32Array,
    to: Float32Array,
    rawProgress: number,
    seedOffset: number,
    transition: LayoutTransition,
  ) {
    const zoomProgress = getFairyEase(rawProgress);
    const flare = Math.sin(Math.PI * rawProgress);
    const settle = getSmoothStep(0.7, 1, rawProgress);
    const isZoomIn = transition.cameraTo.z < transition.cameraFrom.z;
    const focusX = transition.targetTo.x;
    const focusY = transition.targetTo.y;

    for (let offset = 0; offset < positionArray.length; offset += 3) {
      const vertexIndex = offset / 3 + seedOffset;
      const seed = getTransitionSeed(vertexIndex);
      const delayedProgress = getFairyEase(
        THREE.MathUtils.clamp((rawProgress - seed * 0.1) / 0.9, 0, 1),
      );
      const pulseAngle = seed * Math.PI * 8 + rawProgress * Math.PI * (isZoomIn ? 3.6 : -3.2);
      const focusPull = flare * (isZoomIn ? -0.1 : 0.08) * (1 - settle);
      const driftX = Math.sin(pulseAngle) * flare * (7 + seed * 16) * (1 - settle);
      const driftY = Math.cos(pulseAngle * 0.82) * flare * (6 + seed * 13) * (1 - settle);
      const sourceX = from[offset] + (from[offset] - focusX) * focusPull;
      const sourceY = from[offset + 1] + (from[offset + 1] - focusY) * focusPull;

      positionArray[offset] = THREE.MathUtils.lerp(sourceX, to[offset], delayedProgress) + driftX;
      positionArray[offset + 1] =
        THREE.MathUtils.lerp(sourceY, to[offset + 1], zoomProgress) + driftY;
      positionArray[offset + 2] =
        THREE.MathUtils.lerp(from[offset + 2], to[offset + 2], zoomProgress) +
        flare * (isZoomIn ? 16 : 9) * (1 - settle);
    }
  }

  private updateTransitionMaterialState(progress: number) {
    const transition = this.transition;

    if (!transition) {
      return;
    }

    const sphereExpandedTransition = isSphereExpandedTransition(transition);
    const geoProjectionTransition = isGeoProjectionTransition(transition);
    const geoMapToSphereTransition = isGeoMapToSphereTransition(transition);
    const geoMapToExpandedTransition = isGeoMapToExpandedTransition(transition);
    const geoProjectionProgress = geoProjectionTransition
      ? getGeoProjectionForwardProgress(progress, transition)
      : progress;
    const materialProgress = sphereExpandedTransition
      ? getSphereExpandedForwardProgress(progress, transition)
      : geoProjectionTransition
        ? geoProjectionProgress
        : progress;
    const sphereExpandedVisualProgress = getFairyEase(materialProgress);
    const sparkle = Math.sin(Math.PI * materialProgress);
    const edgeFade = getEdgeTransitionFade(materialProgress);
    const selectedEdgeBrightnessScale = this.selection.selectedNodeId
      ? getSelectedEdgeBrightnessScale(this.selection.highlightedEdgeIds.size)
      : 1;
    const edgeMaterial = this.edgeLines?.material as THREE.LineBasicMaterial | undefined;
    const highlightedEdgeMaterial = this.highlightedEdgeLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const flowMarkerMaterial = this.flowMarkerLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const nodeMaterial = this.nodePoints?.material;
    const sphereShellMaterial = this.sphereShell?.material as THREE.MeshBasicMaterial | undefined;

    if (sphereExpandedTransition) {
      this.updateSphereExpandedNodeVisualState(sphereExpandedVisualProgress);
    } else if (geoMapToSphereTransition) {
      this.updateGeoMapSphereNodeVisualState(getFairyEase(progress), transition);
    } else if (geoMapToExpandedTransition) {
      this.updateGeoMapExpandedNodeVisualState(getFairyEase(progress), transition);
    }
    if (edgeMaterial) {
      edgeMaterial.opacity = transition.edgeOpacity * edgeFade;
    }
    setLineMaterialOpacity(highlightedEdgeMaterial, transition.highlightedEdgeOpacity * edgeFade);
    if (flowMarkerMaterial) {
      flowMarkerMaterial.opacity = flowMarkerOpacity * selectedEdgeBrightnessScale * edgeFade;
    }
    if (this.sphereShell && sphereShellMaterial) {
      const shouldShowSphereShell = doesTransitionInvolveSphere(transition);
      this.sphereShell.visible = shouldShowSphereShell;
      if (!shouldShowSphereShell) {
        sphereShellMaterial.opacity = 0;
      } else if (geoProjectionTransition) {
        const flattenProgress = getSmoothStep(0.04, 0.72, geoProjectionProgress);
        this.sphereShell.scale.set(
          THREE.MathUtils.lerp(0.96, 1.18, flattenProgress),
          THREE.MathUtils.lerp(0.96, 0.72, flattenProgress),
          THREE.MathUtils.lerp(0.96, 0.08, flattenProgress),
        );
        sphereShellMaterial.opacity = 0.016 + sparkle * 0.07;
      } else if (isSphereExpandedTransition(transition)) {
        this.sphereShell.scale.setScalar(
          THREE.MathUtils.lerp(0.96, 0.72, sphereExpandedVisualProgress),
        );
        sphereShellMaterial.opacity = 0.012 + sparkle * 0.042;
      } else {
        this.sphereShell.scale.setScalar(
          transition.toLayoutMode === 'sphere3d'
            ? THREE.MathUtils.lerp(0.66, 0.96, getFairyEase(progress))
            : THREE.MathUtils.lerp(0.96, 0.72, getFairyEase(progress)),
        );
        sphereShellMaterial.opacity = 0.012 + sparkle * 0.042;
      }
    }

    if (
      !sphereExpandedTransition &&
      !geoMapToSphereTransition &&
      !geoMapToExpandedTransition &&
      nodeMaterial instanceof THREE.ShaderMaterial
    ) {
      nodeMaterial.uniforms.opacity.value = getNodeMaterialOpacity(
        this.layoutMode,
        Boolean(this.selection.selectedNodeId),
      );
      nodeMaterial.uniforms.backsideFade.value = getNodeBacksideFade(
        this.layoutMode,
        Boolean(this.selection.selectedNodeId),
      );
    }
  }

  private updateSphereExpandedNodeVisualState(sphereToExpandedProgress: number) {
    const hasSelection = Boolean(this.selection.selectedNodeId);
    const nodeMaterial = this.nodePoints?.material;
    const sphereOpacity = getNodeMaterialOpacity('sphere3d', hasSelection);
    const expandedOpacity = getNodeMaterialOpacity('expanded2d', hasSelection);
    const sphereBacksideFade = getNodeBacksideFade('sphere3d', hasSelection);
    const expandedBacksideFade = getNodeBacksideFade('expanded2d', hasSelection);

    if (nodeMaterial instanceof THREE.ShaderMaterial) {
      nodeMaterial.uniforms.opacity.value = THREE.MathUtils.lerp(
        sphereOpacity,
        expandedOpacity,
        sphereToExpandedProgress,
      );
      nodeMaterial.uniforms.backsideFade.value = THREE.MathUtils.lerp(
        sphereBacksideFade,
        expandedBacksideFade,
        sphereToExpandedProgress,
      );
    }

    this.updateSphereExpandedNodeSizes(sphereToExpandedProgress);
  }

  private updateGeoMapSphereNodeVisualState(sphereProgress: number, transition: LayoutTransition) {
    const hasSelection = Boolean(this.selection.selectedNodeId);
    const nodeMaterial = this.nodePoints?.material;
    const mapOpacity = getNodeMaterialOpacity('geoMap2d', hasSelection);
    const sphereOpacity = getNodeMaterialOpacity('sphere3d', hasSelection);
    const mapBacksideFade = getNodeBacksideFade('geoMap2d', hasSelection);
    const sphereBacksideFade = getNodeBacksideFade('sphere3d', hasSelection);

    if (nodeMaterial instanceof THREE.ShaderMaterial) {
      nodeMaterial.uniforms.opacity.value = THREE.MathUtils.lerp(
        mapOpacity,
        sphereOpacity,
        sphereProgress,
      );
      nodeMaterial.uniforms.backsideFade.value = THREE.MathUtils.lerp(
        mapBacksideFade,
        sphereBacksideFade,
        sphereProgress,
      );
    }

    this.updateGeoMapSphereNodeSizes(sphereProgress, transition.sourceLayoutNodeIds);
  }

  private updateGeoMapSphereNodeSizes(
    sphereProgress: number,
    sourceLayoutNodeIds: Set<string> | undefined,
  ) {
    const sizeAttribute = this.nodeGeometry.getAttribute('pointSize') as
      | THREE.BufferAttribute
      | undefined;

    if (sizeAttribute) {
      const sizeArray = sizeAttribute.array as Float32Array;
      this.data.nodes.forEach((node, index) => {
        const isSourceNode = sourceLayoutNodeIds?.has(node.id) ?? true;
        const revealProgress = isSourceNode
          ? sphereProgress
          : getSmoothStep(0.76, 1, sphereProgress);
        const sourceSize = isSourceNode ? getNodePointSize(node, 'geoMap2d') : 0;

        sizeArray[index] = THREE.MathUtils.lerp(
          sourceSize,
          getNodePointSize(node, 'sphere3d'),
          revealProgress,
        );
      });
      sizeAttribute.needsUpdate = true;
    }

    const highlightedSizeAttribute = this.highlightedNodeGeometry.getAttribute('pointSize') as
      | THREE.BufferAttribute
      | undefined;

    if (highlightedSizeAttribute) {
      const highlightedSizeArray = highlightedSizeAttribute.array as Float32Array;
      const highlightedNodeIds = Array.from(this.selection.highlightedNodeIds);

      highlightedNodeIds.forEach((nodeId, index) => {
        if (index >= highlightedSizeArray.length) {
          return;
        }

        const node = this.getNode(nodeId);
        const isSourceNode = sourceLayoutNodeIds?.has(nodeId) ?? true;
        const revealProgress = isSourceNode
          ? sphereProgress
          : getSmoothStep(0.76, 1, sphereProgress);
        const sourceSize = isSourceNode ? getNodePointSize(node, 'geoMap2d', true) : 0;

        highlightedSizeArray[index] = THREE.MathUtils.lerp(
          sourceSize,
          getNodePointSize(node, 'sphere3d', true),
          revealProgress,
        );
      });
      highlightedSizeAttribute.needsUpdate = true;
    }
  }

  private updateGeoMapExpandedNodeVisualState(
    expandedProgress: number,
    transition: LayoutTransition,
  ) {
    const hasSelection = Boolean(this.selection.selectedNodeId);
    const nodeMaterial = this.nodePoints?.material;
    const mapOpacity = getNodeMaterialOpacity('geoMap2d', hasSelection);
    const expandedOpacity = getNodeMaterialOpacity('expanded2d', hasSelection);
    const mapBacksideFade = getNodeBacksideFade('geoMap2d', hasSelection);
    const expandedBacksideFade = getNodeBacksideFade('expanded2d', hasSelection);

    if (nodeMaterial instanceof THREE.ShaderMaterial) {
      nodeMaterial.uniforms.opacity.value = THREE.MathUtils.lerp(
        mapOpacity,
        expandedOpacity,
        expandedProgress,
      );
      nodeMaterial.uniforms.backsideFade.value = THREE.MathUtils.lerp(
        mapBacksideFade,
        expandedBacksideFade,
        expandedProgress,
      );
    }

    this.updateGeoMapExpandedNodeSizes(expandedProgress, transition.sourceLayoutNodeIds);
  }

  private updateGeoMapExpandedNodeSizes(
    expandedProgress: number,
    sourceLayoutNodeIds: Set<string> | undefined,
  ) {
    const sizeAttribute = this.nodeGeometry.getAttribute('pointSize') as
      | THREE.BufferAttribute
      | undefined;

    if (sizeAttribute) {
      const sizeArray = sizeAttribute.array as Float32Array;
      this.data.nodes.forEach((node, index) => {
        const isSourceNode = sourceLayoutNodeIds?.has(node.id) ?? true;
        const revealProgress = isSourceNode
          ? expandedProgress
          : getSmoothStep(0.76, 1, expandedProgress);
        const sourceSize = isSourceNode ? getNodePointSize(node, 'geoMap2d') : 0;

        sizeArray[index] = THREE.MathUtils.lerp(
          sourceSize,
          getNodePointSize(node, 'expanded2d'),
          revealProgress,
        );
      });
      sizeAttribute.needsUpdate = true;
    }

    const highlightedSizeAttribute = this.highlightedNodeGeometry.getAttribute('pointSize') as
      | THREE.BufferAttribute
      | undefined;

    if (highlightedSizeAttribute) {
      const highlightedSizeArray = highlightedSizeAttribute.array as Float32Array;
      const highlightedNodeIds = Array.from(this.selection.highlightedNodeIds);

      highlightedNodeIds.forEach((nodeId, index) => {
        if (index >= highlightedSizeArray.length) {
          return;
        }

        const node = this.getNode(nodeId);
        const isSourceNode = sourceLayoutNodeIds?.has(nodeId) ?? true;
        const revealProgress = isSourceNode
          ? expandedProgress
          : getSmoothStep(0.76, 1, expandedProgress);
        const sourceSize = isSourceNode ? getNodePointSize(node, 'geoMap2d', true) : 0;

        highlightedSizeArray[index] = THREE.MathUtils.lerp(
          sourceSize,
          getNodePointSize(node, 'expanded2d', true),
          revealProgress,
        );
      });
      highlightedSizeAttribute.needsUpdate = true;
    }
  }

  private updateSphereExpandedNodeSizes(sphereToExpandedProgress: number) {
    const sizeAttribute = this.nodeGeometry.getAttribute('pointSize') as
      | THREE.BufferAttribute
      | undefined;

    if (sizeAttribute) {
      const sizeArray = sizeAttribute.array as Float32Array;
      this.data.nodes.forEach((node, index) => {
        sizeArray[index] = THREE.MathUtils.lerp(
          getNodePointSize(node, 'sphere3d'),
          getNodePointSize(node, 'expanded2d'),
          sphereToExpandedProgress,
        );
      });
      sizeAttribute.needsUpdate = true;
    }

    const highlightedSizeAttribute = this.highlightedNodeGeometry.getAttribute('pointSize') as
      | THREE.BufferAttribute
      | undefined;

    if (highlightedSizeAttribute) {
      const highlightedSizeArray = highlightedSizeAttribute.array as Float32Array;
      const highlightedNodeIds = Array.from(this.selection.highlightedNodeIds);

      highlightedNodeIds.forEach((nodeId, index) => {
        if (index >= highlightedSizeArray.length) {
          return;
        }

        const node = this.getNode(nodeId);
        highlightedSizeArray[index] = THREE.MathUtils.lerp(
          getNodePointSize(node, 'sphere3d', true),
          getNodePointSize(node, 'expanded2d', true),
          sphereToExpandedProgress,
        );
      });
      highlightedSizeAttribute.needsUpdate = true;
    }
  }

  private updateTransitionEffectOpacity(opacity: number) {
    const dustMaterial = this.transitionDustPoints?.material;
    const ringMaterial = this.transitionRing?.material as THREE.LineBasicMaterial | undefined;
    const gateMaterial = this.transitionGateLines?.material as THREE.LineBasicMaterial | undefined;
    const projectionMaterial = this.transitionProjectionLines?.material as
      | THREE.LineBasicMaterial
      | undefined;

    if (dustMaterial instanceof THREE.ShaderMaterial) {
      dustMaterial.uniforms.opacity.value = opacity;
    }
    if (ringMaterial) {
      ringMaterial.opacity = opacity * 0.52;
    }
    if (gateMaterial) {
      gateMaterial.opacity = opacity * 0.36;
    }
    if (projectionMaterial) {
      projectionMaterial.opacity = 0;
    }
  }

  private updateFairyTransitionEffect(progress: number, transition: LayoutTransition) {
    const sphereExpandedTransition = isSphereExpandedTransition(transition);
    const projectionTransition = isGeoProjectionTransition(transition);
    const planarMapTransition = isExpandedGeoMapTransition(transition);
    const effectProgress = sphereExpandedTransition
      ? getSphereExpandedForwardProgress(progress, transition)
      : projectionTransition
        ? getGeoProjectionForwardProgress(progress, transition)
        : planarMapTransition
          ? getExpandedGeoMapForwardProgress(progress, transition)
          : progress;
    const sparkle = Math.sin(Math.PI * effectProgress);
    const easedProgress = getFairyEase(effectProgress);
    const mapZoomTransition = isGeoMapScopeTransition(transition);
    const restrainedMapTransition =
      projectionTransition || planarMapTransition || mapZoomTransition;
    const direction =
      sphereExpandedTransition || projectionTransition
        ? 1
        : transition.toLayoutMode === 'sphere3d' ||
            (transition.fromLayoutMode === 'geoMap2d' && transition.toLayoutMode === 'expanded2d')
          ? -1
          : 1;
    const dustPositionAttribute = this.transitionDustGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    if (dustPositionAttribute) {
      const positionArray = dustPositionAttribute.array as Float32Array;
      const baseSpread = sphereExpandedTransition
        ? THREE.MathUtils.lerp(260, 500, easedProgress)
        : transition.toLayoutMode === 'sphere3d'
          ? THREE.MathUtils.lerp(470, 290, easedProgress)
          : THREE.MathUtils.lerp(260, 500, easedProgress);
      const depthScale = sphereExpandedTransition
        ? THREE.MathUtils.lerp(0.94, 0.34, easedProgress)
        : transition.toLayoutMode === 'sphere3d'
          ? THREE.MathUtils.lerp(0.62, 0.94, easedProgress)
          : THREE.MathUtils.lerp(0.94, 0.34, easedProgress);

      for (let index = 0; index < transitionDustCount; index += 1) {
        const seed = getTransitionSeed(index);
        const orbitSeed = getTransitionSeed(index + 21);
        const radius = baseSpread * (0.28 + orbitSeed * 0.72);
        const angle = seed * Math.PI * 2 + effectProgress * direction * (1.7 + orbitSeed * 1.8);
        const offset = index * 3;

        positionArray[offset] =
          Math.cos(angle) * radius +
          Math.sin(effectProgress * Math.PI * 2 + seed * 9) * sparkle * 24;
        positionArray[offset + 1] =
          (getTransitionSeed(index + 17) - 0.5) * 190 + sparkle * (52 + seed * 78);
        positionArray[offset + 2] =
          Math.sin(angle) * radius * depthScale +
          Math.cos(effectProgress * Math.PI * 2.2 + seed * 11) * sparkle * 42;
      }

      dustPositionAttribute.needsUpdate = true;
      this.transitionDustGeometry.computeBoundingSphere();
    }

    this.transitionEffectGroup.rotation.y =
      effectProgress * direction * (restrainedMapTransition ? 0.18 : 0.62);
    this.transitionEffectGroup.rotation.z =
      Math.sin(effectProgress * Math.PI) * (restrainedMapTransition ? 0.014 : 0.035) * direction;
    this.transitionEffectGroup.scale.setScalar(
      1 + sparkle * (restrainedMapTransition ? 0.04 : 0.08),
    );
    if (this.transitionRing) {
      this.transitionRing.rotation.z = effectProgress * direction * 0.28;
      if (projectionTransition) {
        const flattenProgress = getSmoothStep(0.08, 0.78, effectProgress);
        this.transitionRing.scale.set(
          THREE.MathUtils.lerp(0.88, 1.34, flattenProgress),
          THREE.MathUtils.lerp(0.8, 0.18, flattenProgress) + sparkle * 0.05,
          THREE.MathUtils.lerp(1, 0.16, flattenProgress),
        );
      } else if (planarMapTransition) {
        const sweepProgress = getSmoothStep(0.04, 0.82, effectProgress);
        this.transitionRing.scale.set(
          THREE.MathUtils.lerp(0.72, 1.2, sweepProgress),
          0.22 + sparkle * 0.08,
          0.18 + sparkle * 0.04,
        );
      } else if (mapZoomTransition) {
        const isZoomIn = transition.cameraTo.z < transition.cameraFrom.z;
        const zoomProgress = getSmoothStep(0.02, 0.86, progress);
        this.transitionRing.scale.set(
          isZoomIn
            ? THREE.MathUtils.lerp(1.85, 0.62, zoomProgress)
            : THREE.MathUtils.lerp(0.62, 1.72, zoomProgress),
          isZoomIn
            ? THREE.MathUtils.lerp(1.18, 0.34, zoomProgress) + sparkle * 0.05
            : THREE.MathUtils.lerp(0.34, 1.08, zoomProgress) + sparkle * 0.06,
          0.18 + sparkle * 0.04,
        );
      } else if (sphereExpandedTransition) {
        this.transitionRing.scale.set(
          0.86 + easedProgress * 0.3,
          0.8 + sparkle * 0.18,
          1 + sparkle * 0.08,
        );
      } else {
        this.transitionRing.scale.set(
          0.86 + easedProgress * 0.3,
          0.8 + sparkle * 0.18,
          1 + sparkle * 0.08,
        );
      }
    }
    if (this.transitionGateLines) {
      this.transitionGateLines.rotation.y = effectProgress * direction * -0.34;
    }
    this.updateTransitionEffectOpacity(sparkle);
    if (planarMapTransition) {
      this.updatePlanarMapGridEffect(progress, transition);
    } else if (mapZoomTransition) {
      this.updateGeoMapZoomGridEffect(progress, transition);
    } else {
      this.updateProjectionGridEffect(progress, transition);
    }
  }

  private updateGeoMapZoomGridEffect(progress: number, transition: LayoutTransition) {
    const projectionMaterial = this.transitionProjectionLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const positionAttribute = this.transitionProjectionGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    if (!projectionMaterial || !positionAttribute || !isGeoMapScopeTransition(transition)) {
      if (projectionMaterial) {
        projectionMaterial.opacity = 0;
      }
      return;
    }

    const bounds = this.getExpandedLayoutBounds('geoMap2d');
    const positions = positionAttribute.array as Float32Array;
    const zoomProgress = getFairyEase(getSmoothStep(0.04, 0.9, progress));
    const flare = Math.sin(Math.PI * progress);
    const isZoomIn = transition.cameraTo.z < transition.cameraFrom.z;
    const startScale = isZoomIn ? 2.2 : 0.42;
    const endScale = isZoomIn ? 0.94 : 1.86;
    const scale = THREE.MathUtils.lerp(startScale, endScale, zoomProgress);
    const reveal = getSmoothStep(0.02, 0.2, progress) * (1 - getSmoothStep(0.84, 1, progress));
    let offset = 0;
    const writeZoomPoint = (xProgress: number, yProgress: number, phase: number) => {
      const localX = (xProgress - 0.5) * bounds.width * 0.92 * scale;
      const localY = (yProgress - 0.5) * bounds.height * 0.82 * scale;
      const pulse = Math.sin(progress * Math.PI * 4 + phase * Math.PI * 2) * flare * 5;

      positions[offset] = bounds.centerX + localX;
      positions[offset + 1] = bounds.centerY + localY + pulse;
      positions[offset + 2] = flare * (8 + phase * 10);
      offset += 3;
    };

    for (let meridianIndex = 0; meridianIndex < projectionGridMeridianCount; meridianIndex += 1) {
      const xProgress = meridianIndex / (projectionGridMeridianCount - 1);

      for (let segmentIndex = 0; segmentIndex < projectionGridSegments; segmentIndex += 1) {
        const startProgress = segmentIndex / projectionGridSegments;
        const endProgress = (segmentIndex + 1) / projectionGridSegments;

        writeZoomPoint(xProgress, startProgress, xProgress);
        writeZoomPoint(xProgress, endProgress, xProgress);
      }
    }

    for (let parallelIndex = 0; parallelIndex < projectionGridParallelCount; parallelIndex += 1) {
      const yProgress = (parallelIndex + 1) / (projectionGridParallelCount + 1);

      for (let segmentIndex = 0; segmentIndex < projectionGridSegments; segmentIndex += 1) {
        const startProgress = segmentIndex / projectionGridSegments;
        const endProgress = (segmentIndex + 1) / projectionGridSegments;

        writeZoomPoint(startProgress, yProgress, yProgress);
        writeZoomPoint(endProgress, yProgress, yProgress);
      }
    }

    positionAttribute.needsUpdate = true;
    this.transitionProjectionGeometry.computeBoundingSphere();
    projectionMaterial.opacity = reveal * 0.38;
  }

  private updatePlanarMapGridEffect(progress: number, transition: LayoutTransition) {
    const projectionMaterial = this.transitionProjectionLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const positionAttribute = this.transitionProjectionGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    if (!projectionMaterial || !positionAttribute || !isExpandedGeoMapTransition(transition)) {
      if (projectionMaterial) {
        projectionMaterial.opacity = 0;
      }
      return;
    }

    const isMapToExpanded = isGeoMapToExpandedTransition(transition);
    const fromBounds = this.getExpandedLayoutBounds(
      isMapToExpanded ? 'expanded2d' : transition.fromLayoutMode,
    );
    const toBounds = this.getExpandedLayoutBounds(
      isMapToExpanded ? 'geoMap2d' : transition.toLayoutMode,
    );
    const positions = positionAttribute.array as Float32Array;
    const effectProgress = getExpandedGeoMapForwardProgress(progress, transition);
    const sweepProgress = getFairyEase(getSmoothStep(0.04, 0.94, effectProgress));
    const flare = Math.sin(Math.PI * effectProgress);
    const reveal = getSmoothStep(0.02, 0.22, progress) * (1 - getSmoothStep(0.88, 1, progress));
    let offset = 0;
    const writePlanarPoint = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      phase: number,
    ) => {
      const pulse = Math.sin(effectProgress * Math.PI * 4 + phase * Math.PI * 2) * flare * 6;

      positions[offset] = THREE.MathUtils.lerp(fromX, toX, sweepProgress);
      positions[offset + 1] = THREE.MathUtils.lerp(fromY, toY, sweepProgress) + pulse;
      positions[offset + 2] = flare * (7 + phase * 9);
      offset += 3;
    };

    for (let meridianIndex = 0; meridianIndex < projectionGridMeridianCount; meridianIndex += 1) {
      const xProgress = meridianIndex / (projectionGridMeridianCount - 1);
      const fromX =
        fromBounds.centerX - fromBounds.width * 0.48 + fromBounds.width * 0.96 * xProgress;
      const toX = toBounds.centerX - toBounds.width * 0.48 + toBounds.width * 0.96 * xProgress;

      for (let segmentIndex = 0; segmentIndex < projectionGridSegments; segmentIndex += 1) {
        const startProgress = segmentIndex / projectionGridSegments;
        const endProgress = (segmentIndex + 1) / projectionGridSegments;
        const fromStartY =
          fromBounds.centerY - fromBounds.height * 0.42 + fromBounds.height * 0.84 * startProgress;
        const fromEndY =
          fromBounds.centerY - fromBounds.height * 0.42 + fromBounds.height * 0.84 * endProgress;
        const toStartY =
          toBounds.centerY - toBounds.height * 0.42 + toBounds.height * 0.84 * startProgress;
        const toEndY =
          toBounds.centerY - toBounds.height * 0.42 + toBounds.height * 0.84 * endProgress;

        writePlanarPoint(fromX, fromStartY, toX, toStartY, xProgress);
        writePlanarPoint(fromX, fromEndY, toX, toEndY, xProgress);
      }
    }

    for (let parallelIndex = 0; parallelIndex < projectionGridParallelCount; parallelIndex += 1) {
      const yProgress = (parallelIndex + 1) / (projectionGridParallelCount + 1);
      const fromY =
        fromBounds.centerY - fromBounds.height * 0.42 + fromBounds.height * 0.84 * yProgress;
      const toY = toBounds.centerY - toBounds.height * 0.42 + toBounds.height * 0.84 * yProgress;

      for (let segmentIndex = 0; segmentIndex < projectionGridSegments; segmentIndex += 1) {
        const startProgress = segmentIndex / projectionGridSegments;
        const endProgress = (segmentIndex + 1) / projectionGridSegments;
        const fromStartX =
          fromBounds.centerX - fromBounds.width * 0.48 + fromBounds.width * 0.96 * startProgress;
        const fromEndX =
          fromBounds.centerX - fromBounds.width * 0.48 + fromBounds.width * 0.96 * endProgress;
        const toStartX =
          toBounds.centerX - toBounds.width * 0.48 + toBounds.width * 0.96 * startProgress;
        const toEndX =
          toBounds.centerX - toBounds.width * 0.48 + toBounds.width * 0.96 * endProgress;

        writePlanarPoint(fromStartX, fromY, toStartX, toY, yProgress);
        writePlanarPoint(fromEndX, fromY, toEndX, toY, yProgress);
      }
    }

    positionAttribute.needsUpdate = true;
    this.transitionProjectionGeometry.computeBoundingSphere();
    projectionMaterial.opacity = reveal * 0.34;
  }

  private updateProjectionGridEffect(progress: number, transition: LayoutTransition) {
    const projectionMaterial = this.transitionProjectionLines?.material as
      | THREE.LineBasicMaterial
      | undefined;
    const positionAttribute = this.transitionProjectionGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    if (!projectionMaterial || !positionAttribute || !isGeoProjectionTransition(transition)) {
      if (projectionMaterial) {
        projectionMaterial.opacity = 0;
      }
      return;
    }

    const bounds = this.getExpandedLayoutBounds('geoMap2d');
    const projectionProgress = getGeoProjectionForwardProgress(progress, transition);
    const positions = positionAttribute.array as Float32Array;
    const flattenProgress = getSmoothStep(0.08, 0.78, projectionProgress);
    const targetProgress = getFairyEase(getSmoothStep(0.18, 0.94, projectionProgress));
    const reveal = getSmoothStep(0.02, 0.28, progress) * (1 - getSmoothStep(0.86, 1, progress));
    let offset = 0;
    const writeProjectionPoint = (longitude: number, latitude: number) => {
      const sphereX = Math.cos(latitude) * Math.cos(longitude) * sphereVisualRadius;
      const sphereY = Math.sin(latitude) * sphereVisualRadius;
      const sphereZ = Math.cos(latitude) * Math.sin(longitude) * sphereVisualRadius;
      const flatX = (longitude / Math.PI) * bounds.width * 0.48;
      const flatY = (latitude / (Math.PI / 2)) * bounds.height * 0.42;
      const compressedX = sphereX * (1 + flattenProgress * 0.18);
      const compressedY = sphereY * (1 - flattenProgress * 0.08);
      const compressedZ = sphereZ * (1 - flattenProgress * 0.94);

      positions[offset] = THREE.MathUtils.lerp(compressedX, flatX, targetProgress);
      positions[offset + 1] = THREE.MathUtils.lerp(compressedY, flatY, targetProgress);
      positions[offset + 2] = THREE.MathUtils.lerp(compressedZ, 0, targetProgress);
      offset += 3;
    };

    for (let meridianIndex = 0; meridianIndex < projectionGridMeridianCount; meridianIndex += 1) {
      const longitude =
        -Math.PI + (meridianIndex / (projectionGridMeridianCount - 1)) * Math.PI * 2;

      for (let segmentIndex = 0; segmentIndex < projectionGridSegments; segmentIndex += 1) {
        const startLatitude = -Math.PI / 2 + (segmentIndex / projectionGridSegments) * Math.PI;
        const endLatitude = -Math.PI / 2 + ((segmentIndex + 1) / projectionGridSegments) * Math.PI;
        writeProjectionPoint(longitude, startLatitude);
        writeProjectionPoint(longitude, endLatitude);
      }
    }

    for (let parallelIndex = 0; parallelIndex < projectionGridParallelCount; parallelIndex += 1) {
      const latitude =
        -Math.PI / 2 + ((parallelIndex + 1) / (projectionGridParallelCount + 1)) * Math.PI;

      for (let segmentIndex = 0; segmentIndex < projectionGridSegments; segmentIndex += 1) {
        const startLongitude = -Math.PI + (segmentIndex / projectionGridSegments) * Math.PI * 2;
        const endLongitude = -Math.PI + ((segmentIndex + 1) / projectionGridSegments) * Math.PI * 2;
        writeProjectionPoint(startLongitude, latitude);
        writeProjectionPoint(endLongitude, latitude);
      }
    }

    positionAttribute.needsUpdate = true;
    this.transitionProjectionGeometry.computeBoundingSphere();
    projectionMaterial.opacity = reveal * 0.42;
  }

  private updateGeometryPositions() {
    const nodePositions = this.nodeGeometry.getAttribute('position') as THREE.BufferAttribute;
    this.data.nodes.forEach((node, index) => {
      writeTuple(
        nodePositions.array as Float32Array,
        index * 3,
        getNodePosition(this.data, this.layoutMode, node.id),
      );
    });
    nodePositions.needsUpdate = true;
    this.nodeGeometry.computeBoundingSphere();
    this.updateNodeSizes();

    this.buildEdgeGeometry();
    this.updateMaterialState();
  }

  private updateNodeSizes() {
    const sizeAttribute = this.nodeGeometry.getAttribute('pointSize') as
      | THREE.BufferAttribute
      | undefined;

    if (!sizeAttribute) {
      return;
    }

    const sizeArray = sizeAttribute.array as Float32Array;
    this.data.nodes.forEach((node, index) => {
      sizeArray[index] = getNodePointSize(node, this.layoutMode);
    });
    sizeAttribute.needsUpdate = true;
  }

  private updateNodeColors() {
    const colorAttribute = this.nodeGeometry.getAttribute('color') as THREE.BufferAttribute;
    const colorArray = colorAttribute.array as Float32Array;
    const selectedNodeId = this.selection.selectedNodeId;
    const hasSelection = Boolean(selectedNodeId);
    const isExpandedSelected = hasSelection && isExpandedLikeLayout(this.layoutMode);

    this.data.nodes.forEach((node, index) => {
      const offset = index * 3;
      let color = this.getClusterColor(node);
      let intensity = getNodeOverviewIntensity(node);

      if (hasSelection && node.id !== selectedNodeId) {
        color = isExpandedSelected ? expandedSelectedContextColor : selectedContextColor;
        intensity = isExpandedSelected
          ? node.kind === 'process'
            ? 0.98
            : 1.08
          : node.kind === 'process'
            ? 0.82
            : 0.9;
      }

      writeColor(colorArray, offset, color, intensity);
    });

    colorAttribute.needsUpdate = true;
  }

  private getHighlightedNodeColor(node: ProcessFlowGraphNode | undefined) {
    if (!node) {
      return selectedColor;
    }

    return this.getClusterColor(node);
  }

  private getHighlightedEdgeRenders(): HighlightedEdgeRender[] {
    const edgeRenders = Array.from(this.selection.highlightedEdgeIds).reduce<
      HighlightedEdgeRender[]
    >((renders, edgeId) => {
      const edgeIndex = this.data.indexes.edgeById[edgeId];
      const edge = edgeIndex === undefined ? undefined : this.data.edges[edgeIndex];

      if (edge) {
        renders.push({ edge, edgeIndex, intensityScale: 1 });
      }

      return renders;
    }, []);
    const hasSelection = Boolean(this.selection.selectedNodeId);

    if (!hasSelection) {
      return edgeRenders;
    }

    return edgeRenders.map((render) => ({
      ...render,
      intensityScale: this.getHighlightedEdgeIntensityScale(render.edge),
    }));
  }

  private getHighlightedEdgeVisualDirection(
    edge: ProcessFlowGraphEdge,
  ): ProcessFlowGraphEdge['direction'] {
    const selectedNodeId = this.selection.selectedNodeId;

    if (!selectedNodeId || this.layoutMode !== 'geoMap2d') {
      return edge.direction;
    }

    const sourceNode = this.getNode(edge.source);
    const targetNode = this.getNode(edge.target);
    const isProcessLink = sourceNode?.kind === 'process' && targetNode?.kind === 'process';

    if (!isProcessLink) {
      return edge.direction;
    }

    if (edge.target === selectedNodeId) {
      return 'input';
    }

    if (edge.source === selectedNodeId) {
      return 'output';
    }

    return edge.direction;
  }

  private getHighlightedEdgeIntensityScale(edge: ProcessFlowGraphEdge): number {
    const sourceNode = this.getNode(edge.source);
    const targetNode = this.getNode(edge.target);
    const selectedNodeId = this.selection.selectedNodeId;
    const isDirectSelectedEdge =
      Boolean(selectedNodeId) &&
      (edge.source === selectedNodeId ||
        edge.target === selectedNodeId ||
        edge.flowId === this.selection.selectedFlowId);

    if (isDirectSelectedEdge) {
      return this.layoutMode === 'sphere3d' ? 0.94 : 1;
    }

    const amountBoost =
      edge.amount === undefined
        ? 0
        : THREE.MathUtils.clamp(Math.log1p(Math.abs(edge.amount)) / 26, 0, 0.16);
    const sameCluster = sourceNode?.clusterIdLevel1 === targetNode?.clusterIdLevel1;
    const visualDirection = this.getHighlightedEdgeVisualDirection(edge);
    const directionBase = visualDirection === 'input' ? 0.34 : 0.3;

    return directionBase + amountBoost + (sameCluster ? 0.06 : 0.02);
  }

  private updateHighlightedGeometry() {
    const highlightedNodeIds = Array.from(this.selection.highlightedNodeIds);
    const highlightedEdgeRenders = this.getHighlightedEdgeRenders();
    const nodePositions = new Float32Array(highlightedNodeIds.length * 3);
    const nodeColors = new Float32Array(highlightedNodeIds.length * 3);
    const nodeSizes = new Float32Array(highlightedNodeIds.length);
    const segmentCount = this.layoutMode === 'sphere3d' ? sphereHighlightedEdgeSegments : 1;
    const edgePositions = new Float32Array(highlightedEdgeRenders.length * segmentCount * 6);
    const edgeColors = new Float32Array(highlightedEdgeRenders.length * segmentCount * 6);
    const markerCount = this.selection.selectedNodeId ? highlightedEdgeRenders.length : 0;
    const markerPositions = new Float32Array(markerCount * flowMarkerArrowSegments * 6);
    const markerColors = new Float32Array(markerCount * flowMarkerArrowSegments * 6);
    const selectedNodePositions = new Float32Array(this.selection.selectedNodeId ? 3 : 0);
    const selectedNodeId = this.selection.selectedNodeId;
    const selectedEdgeBrightnessScale = this.selection.selectedNodeId
      ? getSelectedEdgeBrightnessScale(highlightedEdgeRenders.length)
      : 1;
    let edgeOffset = 0;
    let markerOffset = 0;
    this.flowMarkers = [];

    highlightedNodeIds.forEach((nodeId, index) => {
      const node = this.getNode(nodeId);
      const highlightIntensity = selectedNodeId && nodeId !== selectedNodeId ? 1.28 : 1.45;

      writeTuple(nodePositions, index * 3, getNodePosition(this.data, this.layoutMode, nodeId));
      writeColor(nodeColors, index * 3, this.getHighlightedNodeColor(node), highlightIntensity);
      nodeSizes[index] = getNodePointSize(node, this.layoutMode, true);
    });
    if (this.selection.selectedNodeId) {
      writeTuple(
        selectedNodePositions,
        0,
        getNodePosition(this.data, this.layoutMode, this.selection.selectedNodeId),
      );
    }
    highlightedEdgeRenders.forEach(({ edge, edgeIndex, intensityScale }) => {
      const source = getNodePosition(this.data, this.layoutMode, edge.source);
      const target = getNodePosition(this.data, this.layoutMode, edge.target);
      const visualDirection = this.getHighlightedEdgeVisualDirection(edge);
      const color = getEdgeColor(visualDirection);
      const baseIntensity = this.selection.selectedNodeId
        ? visualDirection === 'input'
          ? 1.26
          : 1.12
        : visualDirection === 'input'
          ? 1.55
          : 1.38;
      const intensity = baseIntensity * intensityScale * selectedEdgeBrightnessScale;

      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const startProgress = segmentIndex / segmentCount;
        const endProgress = (segmentIndex + 1) / segmentCount;
        const isSelectedSphereEdge =
          this.layoutMode === 'sphere3d' && Boolean(this.selection.selectedNodeId);
        const highlightedSurfaceLift = isSelectedSphereEdge
          ? sphereSelectedEdgeSurfaceLift
          : sphereHighlightedSurfaceLift;
        const highlightedArcLift = isSelectedSphereEdge ? sphereSelectedEdgeArcLift : 0;
        const start =
          this.layoutMode === 'sphere3d'
            ? getSphereArcPoint(
                source,
                target,
                startProgress,
                highlightedSurfaceLift,
                highlightedArcLift,
              )
            : source;
        const end =
          this.layoutMode === 'sphere3d'
            ? getSphereArcPoint(
                source,
                target,
                endProgress,
                highlightedSurfaceLift,
                highlightedArcLift,
              )
            : target;

        writeTuple(edgePositions, edgeOffset, start);
        writeTuple(edgePositions, edgeOffset + 3, end);
        writeColor(edgeColors, edgeOffset, color, intensity);
        writeColor(edgeColors, edgeOffset + 3, color, intensity);
        edgeOffset += 6;
      }

      if (this.selection.selectedNodeId && markerOffset < markerCount) {
        const isSelectedSphereEdge =
          this.layoutMode === 'sphere3d' && Boolean(this.selection.selectedNodeId);
        const highlightedSurfaceLift = isSelectedSphereEdge
          ? sphereSelectedEdgeSurfaceLift
          : sphereHighlightedSurfaceLift;
        const highlightedArcLift = isSelectedSphereEdge ? sphereSelectedEdgeArcLift : 0;
        this.flowMarkers.push({
          arcLift: highlightedArcLift,
          phase: getTransitionSeed(edgeIndex + 11),
          source: edge.source,
          surfaceLift: highlightedSurfaceLift,
          target: edge.target,
        });

        const markerColorOffset = markerOffset * flowMarkerArrowSegments * 6;
        for (let vertexOffset = 0; vertexOffset < flowMarkerArrowSegments * 2; vertexOffset += 1) {
          writeColor(
            markerColors,
            markerColorOffset + vertexOffset * 3,
            color,
            (visualDirection === 'input' ? 1.35 : 1.25) * selectedEdgeBrightnessScale,
          );
        }
        markerOffset += 1;
      }
    });

    const highlightedPositionAttribute = new THREE.BufferAttribute(nodePositions, 3);
    highlightedPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.highlightedNodeGeometry.setAttribute('position', highlightedPositionAttribute);
    this.highlightedNodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
    this.highlightedNodeGeometry.setAttribute('pointSize', new THREE.BufferAttribute(nodeSizes, 1));
    this.highlightedEdgeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(edgePositions, 3),
    );
    this.highlightedEdgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));
    const markerPositionAttribute = new THREE.BufferAttribute(markerPositions, 3);
    markerPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.flowMarkerGeometry.setAttribute('position', markerPositionAttribute);
    this.flowMarkerGeometry.setAttribute('color', new THREE.BufferAttribute(markerColors, 3));
    const selectedPositionAttribute = new THREE.BufferAttribute(selectedNodePositions, 3);
    selectedPositionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.selectedNodeGeometry.setAttribute('position', selectedPositionAttribute);
    this.updateFlowMarkers();
    this.highlightedNodeGeometry.computeBoundingSphere();
    this.highlightedEdgeGeometry.computeBoundingSphere();
    this.flowMarkerGeometry.computeBoundingSphere();
    this.selectedNodeGeometry.computeBoundingSphere();
  }

  private updateFlowMarkers() {
    if (!this.flowMarkers.length) {
      return;
    }

    const positionAttribute = this.flowMarkerGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    if (!positionAttribute) {
      return;
    }

    const positions = positionAttribute.array as Float32Array;
    const elapsed = performance.now() / flowMarkerCycleMs;
    const tipVector = new THREE.Vector3();
    const previousVector = new THREE.Vector3();
    const nextVector = new THREE.Vector3();
    const directionVector = new THREE.Vector3();
    const viewVector = new THREE.Vector3();
    const sideVector = new THREE.Vector3();
    const baseVector = new THREE.Vector3();
    const leftVector = new THREE.Vector3();
    const rightVector = new THREE.Vector3();
    const arrowLength = isExpandedLikeLayout(this.layoutMode)
      ? expandedFlowMarkerArrowLength
      : sphereFlowMarkerArrowLength;
    const arrowWidth = isExpandedLikeLayout(this.layoutMode)
      ? expandedFlowMarkerArrowWidth
      : sphereFlowMarkerArrowWidth;
    const writeVector = (offset: number, vector: THREE.Vector3) => {
      positions[offset] = vector.x;
      positions[offset + 1] = vector.y;
      positions[offset + 2] = vector.z;
    };

    this.flowMarkers.forEach((marker, index) => {
      const progress = 0.12 + ((elapsed + marker.phase) % 1) * 0.76;
      const source = getNodePosition(this.data, this.layoutMode, marker.source);
      const target = getNodePosition(this.data, this.layoutMode, marker.target);
      const previousProgress = THREE.MathUtils.clamp(progress - 0.025, 0.02, 0.98);
      const nextProgress = THREE.MathUtils.clamp(progress + 0.025, 0.02, 0.98);
      const markerOffset = index * flowMarkerArrowSegments * 6;

      setFlowMarkerVector({
        arcLift: marker.arcLift,
        layoutMode: this.layoutMode,
        output: previousVector,
        progress: previousProgress,
        source,
        surfaceLift: marker.surfaceLift,
        target,
      });
      setFlowMarkerVector({
        arcLift: marker.arcLift,
        layoutMode: this.layoutMode,
        output: tipVector,
        progress,
        source,
        surfaceLift: marker.surfaceLift,
        target,
      });
      setFlowMarkerVector({
        arcLift: marker.arcLift,
        layoutMode: this.layoutMode,
        output: nextVector,
        progress: nextProgress,
        source,
        surfaceLift: marker.surfaceLift,
        target,
      });

      directionVector.subVectors(nextVector, previousVector);
      if (directionVector.lengthSq() < 0.0001) {
        directionVector.subVectors(tipVector, previousVector);
      }
      if (directionVector.lengthSq() < 0.0001) {
        directionVector.set(1, 0, 0);
      }
      directionVector.normalize();

      viewVector.subVectors(this.camera.position, tipVector);
      if (viewVector.lengthSq() < 0.0001) {
        viewVector.copy(this.camera.up);
      }
      viewVector.normalize();

      sideVector.crossVectors(directionVector, viewVector);
      if (sideVector.lengthSq() < 0.0001) {
        sideVector.crossVectors(directionVector, this.camera.up);
      }
      if (sideVector.lengthSq() < 0.0001) {
        sideVector.set(0, 1, 0);
      }
      sideVector.normalize();

      baseVector.copy(tipVector).addScaledVector(directionVector, -arrowLength);
      leftVector.copy(baseVector).addScaledVector(sideVector, arrowWidth);
      rightVector.copy(baseVector).addScaledVector(sideVector, -arrowWidth);

      writeVector(markerOffset, baseVector);
      writeVector(markerOffset + 3, tipVector);
      writeVector(markerOffset + 6, leftVector);
      writeVector(markerOffset + 9, tipVector);
      writeVector(markerOffset + 12, rightVector);
      writeVector(markerOffset + 15, tipVector);
    });

    positionAttribute.needsUpdate = true;
  }

  private getSelectedNodePulseBaseSize() {
    const transition = this.transition;

    if (transition && isSphereExpandedTransition(transition)) {
      return THREE.MathUtils.lerp(
        sphereSelectedNodePulseBaseSize,
        expandedSelectedNodePulseBaseSize,
        this.getCurrentSphereExpandedVisualProgress(transition),
      );
    }
    if (transition && isGeoMapToSphereTransition(transition)) {
      return THREE.MathUtils.lerp(
        expandedSelectedNodePulseBaseSize,
        sphereSelectedNodePulseBaseSize,
        this.getCurrentTransitionVisualProgress(transition),
      );
    }

    return this.layoutMode === 'sphere3d'
      ? sphereSelectedNodePulseBaseSize
      : expandedSelectedNodePulseBaseSize;
  }

  private getSelectedNodePulseSizeDelta() {
    const transition = this.transition;

    if (transition && isSphereExpandedTransition(transition)) {
      return THREE.MathUtils.lerp(
        sphereSelectedNodePulseSizeDelta,
        expandedSelectedNodePulseSizeDelta,
        this.getCurrentSphereExpandedVisualProgress(transition),
      );
    }
    if (transition && isGeoMapToSphereTransition(transition)) {
      return THREE.MathUtils.lerp(
        expandedSelectedNodePulseSizeDelta,
        sphereSelectedNodePulseSizeDelta,
        this.getCurrentTransitionVisualProgress(transition),
      );
    }

    return this.layoutMode === 'sphere3d'
      ? sphereSelectedNodePulseSizeDelta
      : expandedSelectedNodePulseSizeDelta;
  }

  private getCurrentSphereExpandedVisualProgress(transition: LayoutTransition) {
    return getFairyEase(
      getSphereExpandedForwardProgress(
        this.getCurrentTransitionRawProgress(transition),
        transition,
      ),
    );
  }

  private getCurrentTransitionVisualProgress(transition: LayoutTransition) {
    return getFairyEase(this.getCurrentTransitionRawProgress(transition));
  }

  private getCurrentTransitionRawProgress(transition: LayoutTransition) {
    const rawProgress = THREE.MathUtils.clamp(
      (performance.now() - transition.startedAt) / transition.duration,
      0,
      1,
    );

    return rawProgress;
  }

  private getFlatSelectionPulseBoost() {
    const transition = this.sphereSelectionTransition;

    if (!transition?.isFlatSelection) {
      return 0;
    }

    const rawProgress = THREE.MathUtils.clamp(
      (performance.now() - transition.startedAt) / transition.duration,
      0,
      1,
    );

    return Math.sin(Math.PI * rawProgress) * (this.layoutMode === 'geoMap2d' ? 7 : 10);
  }

  private updateSelectedNodePulse() {
    const selectedNodeMaterial = this.selectedNodePoint?.material as
      | THREE.PointsMaterial
      | undefined;

    if (!selectedNodeMaterial) {
      return;
    }

    const selectedNodeId = this.selection.selectedNodeId;

    if (!selectedNodeId) {
      selectedNodeMaterial.opacity = 0;
      return;
    }

    const selectedNode = this.getNode(selectedNodeId);

    if (selectedNode) {
      selectedNodeMaterial.color.copy(this.getClusterColor(selectedNode));
    }

    const rawProgress = (performance.now() % selectedNodePulseCycleMs) / selectedNodePulseCycleMs;
    const wave = 0.5 - Math.cos(rawProgress * Math.PI * 2) * 0.5;
    const easedPulse = getSmoothStep(0, 1, wave);

    selectedNodeMaterial.opacity =
      THREE.MathUtils.lerp(selectedNodePulseMinOpacity, selectedNodePulseMaxOpacity, easedPulse) *
      this.selectedNodeRevealProgress;
    selectedNodeMaterial.size =
      this.getSelectedNodePulseBaseSize() +
      this.getSelectedNodePulseSizeDelta() * easedPulse +
      this.getFlatSelectionPulseBoost();
  }

  private focusNode(nodeId: string) {
    const [x, y, z] = getNodePosition(this.data, this.layoutMode, nodeId);

    if (this.layoutMode === 'sphere3d') {
      const direction = new THREE.Vector3(x, y, z).normalize();
      const cameraOffset = direction.multiplyScalar(575);
      this.controls.target.set(x * 0.18, y * 0.18, z * 0.18);
      this.camera.position.set(x + cameraOffset.x, y + cameraOffset.y, z + cameraOffset.z);
    } else {
      this.focusCameraFrame({
        position: new THREE.Vector3(x, y, expandedFocusCameraDistance),
        target: new THREE.Vector3(x, y, 0),
      });
      return;
    }
    this.controls.update();
  }

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.nodePoints) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );

    this.raycaster.setFromCamera(pointer, this.camera);
    const [hit] = this.raycaster.intersectObject(this.nodePoints);
    const hitIndex = hit?.index;
    const node = hitIndex === undefined ? undefined : this.data.nodes[hitIndex];
    const nextNodeId = node?.id ?? null;

    this.renderer.domElement.style.cursor =
      this.interactionMode === 'select' && nextNodeId ? 'pointer' : 'grab';
    if (nextNodeId !== this.hoveredNodeId) {
      this.hoveredNodeId = nextNodeId;
      this.callbacks.onNodeHover?.(
        nextNodeId,
        nextNodeId ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : undefined,
      );
    } else if (nextNodeId) {
      this.callbacks.onNodeHover?.(nextNodeId, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
  };

  private handlePointerLeave = () => {
    this.hoveredNodeId = null;
    this.callbacks.onNodeHover?.(null);
  };

  private handleClick = () => {
    if (this.interactionMode === 'select' && this.hoveredNodeId) {
      this.callbacks.onNodeClick?.(this.hoveredNodeId);
    }
  };

  private render = () => {
    this.updateLayoutTransition();
    this.updateCameraFocusTransition();
    this.updateSphereSelectionTransition();
    this.updateFlowMarkers();
    this.updateSelectedNodePulse();

    if (
      !this.transition &&
      !this.cameraFocusTransition &&
      !this.sphereSelectionTransition &&
      this.layoutMode === 'sphere3d' &&
      !this.selection.selectedNodeId
    ) {
      this.group.rotation.y += 0.0011;
    }
    this.controls.update();
    this.updateGeoMapBackdropFrame();
    this.renderer.render(this.scene, this.camera);
  };
}
