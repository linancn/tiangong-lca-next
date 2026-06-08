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
  fromLayoutMode: ProcessFlowGraphLayoutName;
  highlightedEdgeOpacity: number;
  highlightedNodeFrom: Float32Array;
  highlightedNodeTo: Float32Array;
  nodeFrom: Float32Array;
  nodeTo: Float32Array;
  selectedNodeFrom: Float32Array;
  selectedNodeTo: Float32Array;
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
const layoutTransitionDurationMs = 1450;
const transitionDustCount = 176;
const transitionRingSegments = 128;
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

  data.clusters?.forEach((cluster, index) => {
    const colorIndex = cluster.colorIndex ?? index;
    clusterColors.set(
      cluster.id,
      cluster.color ? new THREE.Color(cluster.color) : getClusterPaletteColor(colorIndex),
    );
  });

  data.nodes.forEach((node) => {
    if (clusterColors.has(node.clusterId)) {
      return;
    }

    clusterColors.set(
      node.clusterId,
      clusterColorMap[node.clusterId]
        ? new THREE.Color(clusterColorMap[node.clusterId])
        : getClusterPaletteColor(getStableHash(node.clusterId)),
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
    return layoutMode === 'sphere3d' ? (isProcess ? 16 : 12) : isProcess ? 26 : 19;
  }

  if (layoutMode === 'sphere3d') {
    return isProcess ? 10 : 7.6;
  }

  return isProcess ? 22 : 16;
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

  setData(data: ProcessFlowGraphData) {
    this.finishCameraFocusTransition(false);
    this.finishLayoutTransition(false);
    this.data = data;
    this.clusterColors = buildClusterColors(data);
    this.buildScene();
    this.resetCamera();
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
    const frameTo = this.getCameraFrame(
      layoutMode,
      layoutMode === 'geoMap2d' && fromLayoutMode !== 'geoMap2d'
        ? undefined
        : this.selection.selectedNodeId,
    );

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
    this.finishCameraFocusTransition(true);
    this.finishLayoutTransition(true);
    const hadSelection = Boolean(this.selection.selectedNodeId);
    this.selection = selection;

    this.buildEdgeGeometry();
    this.updateNodeColors();
    this.updateHighlightedGeometry();
    this.updateMaterialState();

    if (selection.selectedNodeId && this.layoutMode !== 'sphere3d') {
      this.focusNode(selection.selectedNodeId);
    } else if (hadSelection && this.layoutMode !== 'sphere3d') {
      this.focusCameraFrame(this.getCameraFrame(this.layoutMode));
    }
  }

  resetCamera() {
    const frame = this.getCameraFrame(this.layoutMode, this.selection.selectedNodeId);

    this.camera.position.copy(frame.position);
    this.controls.target.copy(frame.target);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private getCameraFrame(
    layoutMode: ProcessFlowGraphLayoutName,
    selectedNodeId?: string,
  ): CameraFrame {
    if (layoutMode === 'sphere3d') {
      return {
        position: new THREE.Vector3(0, 0, this.getSphereCameraDistance()),
        target: new THREE.Vector3(0, 0, 0),
      };
    }

    if (selectedNodeId) {
      const [x, y] = getNodePosition(this.data, layoutMode, selectedNodeId);

      return {
        position: new THREE.Vector3(x, y, expandedFocusCameraDistance),
        target: new THREE.Vector3(x, y, 0),
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

    this.transitionEffectGroup.visible = false;
    this.transitionEffectGroup.add(this.transitionDustPoints);
    this.transitionEffectGroup.add(this.transitionRing);
    this.transitionEffectGroup.add(this.transitionGateLines);
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
    const hasSelection = Boolean(this.selection.selectedNodeId);

    if (hasSelection) {
      return this.data.edges.map((edge) => ({ edge, intensityScale: 0.72 }));
    }

    return this.data.edges
      .map((edge, index) => {
        const sourceNode = this.getNode(edge.source);
        const targetNode = this.getNode(edge.target);
        const isCrossCluster =
          Boolean(sourceNode && targetNode) && sourceNode?.clusterId !== targetNode?.clusterId;
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
    return this.clusterColors.get(node.clusterId)?.clone() ?? new THREE.Color('#8da2b3');
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

    if (sourceNode.clusterId === targetNode.clusterId) {
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
    const sameCluster = sourceNode?.clusterId === targetNode?.clusterId;
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
      this.edgeLines.visible = true;
    }
    if (edgeMaterial) {
      edgeMaterial.opacity =
        isSphere || isExpandedLikeLayout(this.layoutMode)
          ? hasSelection
            ? 0.02
            : 0.032
          : hasSelection
            ? 0.06
            : 0.09;
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
      nodeMaterial.uniforms.opacity.value = isSphere
        ? hasSelection
          ? 0.64
          : 0.62
        : hasSelection
          ? isExpandedLikeLayout(this.layoutMode)
            ? 0.96
            : 0.68
          : 0.84;
      nodeMaterial.uniforms.backsideFade.value = isSphere && !hasSelection ? 1 : 0;
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
      setGeometryPositionArray(this.nodeGeometry, transition.nodeTo);
      setGeometryPositionArray(this.highlightedNodeGeometry, transition.highlightedNodeTo);
      setGeometryPositionArray(this.selectedNodeGeometry, transition.selectedNodeTo);
      this.camera.position.copy(transition.cameraTo);
      this.controls.target.copy(transition.targetTo);
      this.camera.updateProjectionMatrix();
      this.controls.update();
    }

    this.transition = undefined;
    this.controls.enabled = true;
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
    if (!this.transition) {
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
    );
    this.applyMorphPositions(
      this.highlightedNodeGeometry,
      transition.highlightedNodeFrom,
      transition.highlightedNodeTo,
      easedProgress,
      rawProgress,
      2000,
    );
    this.applyMorphPositions(
      this.selectedNodeGeometry,
      transition.selectedNodeFrom,
      transition.selectedNodeTo,
      easedProgress,
      rawProgress,
      4000,
    );
    this.camera.position.lerpVectors(transition.cameraFrom, transition.cameraTo, easedProgress);
    this.controls.target.lerpVectors(transition.targetFrom, transition.targetTo, easedProgress);
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

  private updateTransitionMaterialState(progress: number) {
    const transition = this.transition;

    if (!transition) {
      return;
    }

    const sparkle = Math.sin(Math.PI * progress);
    const edgeFade = getEdgeTransitionFade(progress);
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
    const sphereShellMaterial = this.sphereShell?.material as THREE.MeshBasicMaterial | undefined;

    if (edgeMaterial) {
      edgeMaterial.opacity = transition.edgeOpacity * edgeFade;
    }
    setLineMaterialOpacity(highlightedEdgeMaterial, transition.highlightedEdgeOpacity * edgeFade);
    if (flowMarkerMaterial) {
      flowMarkerMaterial.opacity = flowMarkerOpacity * selectedEdgeBrightnessScale * edgeFade;
    }
    if (this.sphereShell && sphereShellMaterial) {
      this.sphereShell.visible = true;
      this.sphereShell.scale.setScalar(
        transition.toLayoutMode === 'sphere3d'
          ? THREE.MathUtils.lerp(0.66, 0.96, getFairyEase(progress))
          : THREE.MathUtils.lerp(0.96, 0.72, getFairyEase(progress)),
      );
      sphereShellMaterial.opacity = 0.012 + sparkle * 0.042;
    }
  }

  private updateTransitionEffectOpacity(opacity: number) {
    const dustMaterial = this.transitionDustPoints?.material;
    const ringMaterial = this.transitionRing?.material as THREE.LineBasicMaterial | undefined;
    const gateMaterial = this.transitionGateLines?.material as THREE.LineBasicMaterial | undefined;

    if (dustMaterial instanceof THREE.ShaderMaterial) {
      dustMaterial.uniforms.opacity.value = opacity;
    }
    if (ringMaterial) {
      ringMaterial.opacity = opacity * 0.52;
    }
    if (gateMaterial) {
      gateMaterial.opacity = opacity * 0.36;
    }
  }

  private updateFairyTransitionEffect(progress: number, transition: LayoutTransition) {
    const sparkle = Math.sin(Math.PI * progress);
    const easedProgress = getFairyEase(progress);
    const direction = transition.toLayoutMode === 'sphere3d' ? -1 : 1;
    const dustPositionAttribute = this.transitionDustGeometry.getAttribute('position') as
      | THREE.BufferAttribute
      | undefined;

    if (dustPositionAttribute) {
      const positionArray = dustPositionAttribute.array as Float32Array;
      const baseSpread =
        transition.toLayoutMode === 'sphere3d'
          ? THREE.MathUtils.lerp(470, 290, easedProgress)
          : THREE.MathUtils.lerp(260, 500, easedProgress);
      const depthScale =
        transition.toLayoutMode === 'sphere3d'
          ? THREE.MathUtils.lerp(0.62, 0.94, easedProgress)
          : THREE.MathUtils.lerp(0.94, 0.34, easedProgress);

      for (let index = 0; index < transitionDustCount; index += 1) {
        const seed = getTransitionSeed(index);
        const orbitSeed = getTransitionSeed(index + 21);
        const radius = baseSpread * (0.28 + orbitSeed * 0.72);
        const angle = seed * Math.PI * 2 + progress * direction * (1.7 + orbitSeed * 1.8);
        const offset = index * 3;

        positionArray[offset] =
          Math.cos(angle) * radius + Math.sin(progress * Math.PI * 2 + seed * 9) * sparkle * 24;
        positionArray[offset + 1] =
          (getTransitionSeed(index + 17) - 0.5) * 190 + sparkle * (52 + seed * 78);
        positionArray[offset + 2] =
          Math.sin(angle) * radius * depthScale +
          Math.cos(progress * Math.PI * 2.2 + seed * 11) * sparkle * 42;
      }

      dustPositionAttribute.needsUpdate = true;
      this.transitionDustGeometry.computeBoundingSphere();
    }

    this.transitionEffectGroup.rotation.y = progress * direction * 0.62;
    this.transitionEffectGroup.rotation.z = Math.sin(progress * Math.PI) * 0.035 * direction;
    this.transitionEffectGroup.scale.setScalar(1 + sparkle * 0.08);
    if (this.transitionRing) {
      this.transitionRing.rotation.z = progress * direction * 0.28;
      this.transitionRing.scale.set(
        0.86 + easedProgress * 0.3,
        0.8 + sparkle * 0.18,
        1 + sparkle * 0.08,
      );
    }
    if (this.transitionGateLines) {
      this.transitionGateLines.rotation.y = progress * direction * -0.34;
    }
    this.updateTransitionEffectOpacity(sparkle);
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
    const hasSelection = Boolean(this.selection.selectedNodeId);
    const isExpandedSelected = hasSelection && isExpandedLikeLayout(this.layoutMode);

    this.data.nodes.forEach((node, index) => {
      const offset = index * 3;
      let color = this.getClusterColor(node);
      let intensity = getNodeOverviewIntensity(node);

      if (hasSelection) {
        color = isExpandedSelected ? expandedSelectedContextColor : selectedContextColor;
        intensity = isExpandedSelected
          ? node.kind === 'process'
            ? 0.98
            : 1.08
          : node.kind === 'process'
            ? 0.82
            : 0.9;
      }
      if (this.selection.highlightedNodeIds.has(node.id)) {
        color = this.getClusterColor(node);
        intensity = getNodeOverviewIntensity(node);
      }

      writeColor(colorArray, offset, color, intensity);
    });

    colorAttribute.needsUpdate = true;
  }

  private getHighlightedNodeColor(node: ProcessFlowGraphNode | undefined) {
    return node ? this.getClusterColor(node) : selectedColor;
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
    const sameCluster = sourceNode?.clusterId === targetNode?.clusterId;
    const directionBase = edge.direction === 'input' ? 0.34 : 0.3;

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
    const selectedEdgeBrightnessScale = this.selection.selectedNodeId
      ? getSelectedEdgeBrightnessScale(highlightedEdgeRenders.length)
      : 1;
    let edgeOffset = 0;
    let markerOffset = 0;
    this.flowMarkers = [];

    highlightedNodeIds.forEach((nodeId, index) => {
      const node = this.getNode(nodeId);

      writeTuple(nodePositions, index * 3, getNodePosition(this.data, this.layoutMode, nodeId));
      writeColor(nodeColors, index * 3, this.getHighlightedNodeColor(node), 1.45);
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
      const color = getEdgeColor(edge.direction);
      const baseIntensity = this.selection.selectedNodeId
        ? edge.direction === 'input'
          ? 1.26
          : 1.12
        : edge.direction === 'input'
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
            (edge.direction === 'input' ? 1.35 : 1.25) * selectedEdgeBrightnessScale,
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
    return this.layoutMode === 'sphere3d'
      ? sphereSelectedNodePulseBaseSize
      : expandedSelectedNodePulseBaseSize;
  }

  private getSelectedNodePulseSizeDelta() {
    return this.layoutMode === 'sphere3d'
      ? sphereSelectedNodePulseSizeDelta
      : expandedSelectedNodePulseSizeDelta;
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

    selectedNodeMaterial.opacity = THREE.MathUtils.lerp(
      selectedNodePulseMinOpacity,
      selectedNodePulseMaxOpacity,
      easedPulse,
    );
    selectedNodeMaterial.size =
      this.getSelectedNodePulseBaseSize() + this.getSelectedNodePulseSizeDelta() * easedPulse;
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
    this.updateFlowMarkers();
    this.updateSelectedNodePulse();

    if (
      !this.transition &&
      !this.cameraFocusTransition &&
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
