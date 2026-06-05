import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { createEmptyProcessFlowGraphSelection } from './graphSelection';
import type {
  ProcessFlowGraphData,
  ProcessFlowGraphLayoutName,
  ProcessFlowGraphNode,
  ProcessFlowGraphSelection,
} from './graphTypes';

type EngineCallbacks = {
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null, position?: { x: number; y: number }) => void;
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

const mutedColor = new THREE.Color('#5f7684');
const selectedColor = new THREE.Color('#ffffff');
const processHighlightColor = new THREE.Color('#ffb947');
const inputHighlightColor = new THREE.Color('#23f4ff');
const outputHighlightColor = new THREE.Color('#b9f63c');
const otherHighlightColor = new THREE.Color('#668cff');

function getClusterColor(node: ProcessFlowGraphNode): THREE.Color {
  return new THREE.Color(clusterColorMap[node.clusterId] ?? '#8da2b3');
}

function getNodePosition(
  data: ProcessFlowGraphData,
  layoutMode: ProcessFlowGraphLayoutName,
  nodeId: string,
): [number, number, number] {
  return data.layouts[layoutMode][nodeId] ?? [0, 0, 0];
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

export class ProcessFlowGraphEngine {
  private callbacks: EngineCallbacks;

  private camera: THREE.PerspectiveCamera;

  private container: HTMLElement;

  private controls: OrbitControls;

  private data: ProcessFlowGraphData;

  private edgeGeometry = new THREE.BufferGeometry();

  private edgeLines?: THREE.LineSegments;

  private group = new THREE.Group();

  private highlightedEdgeGeometry = new THREE.BufferGeometry();

  private highlightedEdgeLines?: THREE.LineSegments;

  private highlightedNodeGeometry = new THREE.BufferGeometry();

  private highlightedNodePoints?: THREE.Points;

  private hoveredNodeId: string | null = null;

  private layoutMode: ProcessFlowGraphLayoutName;

  private nodeGeometry = new THREE.BufferGeometry();

  private nodePoints?: THREE.Points;

  private raycaster = new THREE.Raycaster();

  private renderer: THREE.WebGLRenderer;

  private scene = new THREE.Scene();

  private selection: ProcessFlowGraphSelection = createEmptyProcessFlowGraphSelection();

  constructor({
    callbacks,
    container,
    data,
    layoutMode,
  }: {
    callbacks?: EngineCallbacks;
    container: HTMLElement;
    data: ProcessFlowGraphData;
    layoutMode: ProcessFlowGraphLayoutName;
  }) {
    this.callbacks = callbacks ?? {};
    this.container = container;
    this.data = data;
    this.layoutMode = layoutMode;
    this.camera = new THREE.PerspectiveCamera(42, 1, 1, 2400);
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearAlpha(0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 1200;
    this.controls.minDistance = 120;
    this.raycaster.params.Points = { threshold: 8 };
    this.scene.add(this.group);
    this.scene.add(new THREE.AmbientLight(0x8ccfff, 1.4));
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

  setData(data: ProcessFlowGraphData) {
    this.data = data;
    this.buildScene();
    this.resetCamera();
  }

  setLayoutMode(layoutMode: ProcessFlowGraphLayoutName) {
    if (this.layoutMode === layoutMode) {
      return;
    }

    this.layoutMode = layoutMode;
    this.group.rotation.set(0, 0, 0);
    this.updateGeometryPositions();
    this.updateHighlightedGeometry();
    this.resetCamera();
  }

  setSelection(selection: ProcessFlowGraphSelection) {
    this.selection = selection;
    this.updateNodeColors();
    this.updateHighlightedGeometry();

    if (selection.selectedNodeId) {
      this.focusNode(selection.selectedNodeId);
    }
  }

  resetCamera() {
    if (this.layoutMode === 'sphere3d') {
      this.camera.position.set(0, 0, 760);
      this.controls.target.set(0, 0, 0);
    } else {
      this.camera.position.set(0, 0, 820);
      this.controls.target.set(0, 0, 0);
    }
    this.camera.updateProjectionMatrix();
    this.controls.update();
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

  private buildScene() {
    this.group.clear();
    this.nodeGeometry.dispose();
    this.edgeGeometry.dispose();
    this.highlightedNodeGeometry.dispose();
    this.highlightedEdgeGeometry.dispose();
    this.nodeGeometry = new THREE.BufferGeometry();
    this.edgeGeometry = new THREE.BufferGeometry();
    this.highlightedNodeGeometry = new THREE.BufferGeometry();
    this.highlightedEdgeGeometry = new THREE.BufferGeometry();

    this.buildNodeGeometry();
    this.buildEdgeGeometry();

    this.edgeLines = new THREE.LineSegments(
      this.edgeGeometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        opacity: 0.18,
        transparent: true,
        vertexColors: true,
      }),
    );
    this.nodePoints = new THREE.Points(
      this.nodeGeometry,
      new THREE.PointsMaterial({
        blending: THREE.AdditiveBlending,
        opacity: 0.84,
        size: 4.6,
        sizeAttenuation: true,
        transparent: true,
        vertexColors: true,
      }),
    );
    this.highlightedEdgeLines = new THREE.LineSegments(
      this.highlightedEdgeGeometry,
      new THREE.LineBasicMaterial({
        blending: THREE.AdditiveBlending,
        color: '#29f7ff',
        opacity: 0.95,
        transparent: true,
      }),
    );
    this.highlightedNodePoints = new THREE.Points(
      this.highlightedNodeGeometry,
      new THREE.PointsMaterial({
        blending: THREE.AdditiveBlending,
        color: '#ffffff',
        opacity: 0.98,
        size: 11,
        sizeAttenuation: true,
        transparent: true,
      }),
    );

    this.group.add(this.edgeLines);
    this.group.add(this.nodePoints);
    this.group.add(this.highlightedEdgeLines);
    this.group.add(this.highlightedNodePoints);
    this.updateHighlightedGeometry();
  }

  private buildNodeGeometry() {
    const positions = new Float32Array(this.data.nodes.length * 3);
    const colors = new Float32Array(this.data.nodes.length * 3);

    this.data.nodes.forEach((node, index) => {
      writeTuple(positions, index * 3, getNodePosition(this.data, this.layoutMode, node.id));
      writeColor(colors, index * 3, getClusterColor(node), node.kind === 'process' ? 0.92 : 1.16);
    });

    this.nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.nodeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.nodeGeometry.computeBoundingSphere();
  }

  private buildEdgeGeometry() {
    const positions = new Float32Array(this.data.edges.length * 6);
    const colors = new Float32Array(this.data.edges.length * 6);

    this.data.edges.forEach((edge, index) => {
      const positionOffset = index * 6;
      const colorOffset = index * 6;
      const source = getNodePosition(this.data, this.layoutMode, edge.source);
      const target = getNodePosition(this.data, this.layoutMode, edge.target);
      const color = edge.direction === 'input' ? inputHighlightColor : outputHighlightColor;

      writeTuple(positions, positionOffset, source);
      writeTuple(positions, positionOffset + 3, target);
      writeColor(colors, colorOffset, color, 0.38);
      writeColor(colors, colorOffset + 3, color, 0.38);
    });

    this.edgeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.edgeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.edgeGeometry.computeBoundingSphere();
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

    const edgePositions = this.edgeGeometry.getAttribute('position') as THREE.BufferAttribute;
    this.data.edges.forEach((edge, index) => {
      const offset = index * 6;
      writeTuple(
        edgePositions.array as Float32Array,
        offset,
        getNodePosition(this.data, this.layoutMode, edge.source),
      );
      writeTuple(
        edgePositions.array as Float32Array,
        offset + 3,
        getNodePosition(this.data, this.layoutMode, edge.target),
      );
    });
    edgePositions.needsUpdate = true;
    this.edgeGeometry.computeBoundingSphere();
  }

  private updateNodeColors() {
    const colorAttribute = this.nodeGeometry.getAttribute('color') as THREE.BufferAttribute;
    const colorArray = colorAttribute.array as Float32Array;
    const hasSelection = Boolean(this.selection.selectedNodeId);

    this.data.nodes.forEach((node, index) => {
      const offset = index * 3;
      let color = getClusterColor(node);
      let intensity = node.kind === 'process' ? 0.8 : 0.98;

      if (hasSelection) {
        color = mutedColor;
        intensity = 0.2;
      }
      if (this.selection.relatedFlowIds.has(node.id)) {
        color = this.selection.inputFlowIds.has(node.id)
          ? inputHighlightColor
          : this.selection.outputFlowIds.has(node.id)
            ? outputHighlightColor
            : otherHighlightColor;
        intensity = 1.55;
      }
      if (this.selection.relatedProcessIds.has(node.id)) {
        color = processHighlightColor;
        intensity = 1.28;
      }
      if (node.id === this.selection.selectedNodeId) {
        color = selectedColor;
        intensity = 1.9;
      }

      writeColor(colorArray, offset, color, intensity);
    });

    colorAttribute.needsUpdate = true;
  }

  private updateHighlightedGeometry() {
    const highlightedNodeIds = Array.from(this.selection.highlightedNodeIds);
    const highlightedEdgeIds = Array.from(this.selection.highlightedEdgeIds);
    const nodePositions = new Float32Array(highlightedNodeIds.length * 3);
    const edgePositions = new Float32Array(highlightedEdgeIds.length * 6);

    highlightedNodeIds.forEach((nodeId, index) => {
      writeTuple(nodePositions, index * 3, getNodePosition(this.data, this.layoutMode, nodeId));
    });
    highlightedEdgeIds.forEach((edgeId, index) => {
      const edgeIndex = this.data.indexes.edgeById[edgeId];
      const edge = edgeIndex === undefined ? undefined : this.data.edges[edgeIndex];
      if (!edge) {
        return;
      }
      const offset = index * 6;
      writeTuple(edgePositions, offset, getNodePosition(this.data, this.layoutMode, edge.source));
      writeTuple(
        edgePositions,
        offset + 3,
        getNodePosition(this.data, this.layoutMode, edge.target),
      );
    });

    this.highlightedNodeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(nodePositions, 3),
    );
    this.highlightedEdgeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(edgePositions, 3),
    );
    this.highlightedNodeGeometry.computeBoundingSphere();
    this.highlightedEdgeGeometry.computeBoundingSphere();
  }

  private focusNode(nodeId: string) {
    const [x, y, z] = getNodePosition(this.data, this.layoutMode, nodeId);

    if (this.layoutMode === 'sphere3d') {
      const direction = new THREE.Vector3(x, y, z).normalize();
      const cameraOffset = direction.multiplyScalar(390);
      this.controls.target.set(x * 0.35, y * 0.35, z * 0.35);
      this.camera.position.set(x + cameraOffset.x, y + cameraOffset.y, z + cameraOffset.z);
    } else {
      this.controls.target.set(x, y, 0);
      this.camera.position.set(x, y, 430);
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

    this.renderer.domElement.style.cursor = nextNodeId ? 'pointer' : 'grab';
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
    if (this.hoveredNodeId) {
      this.callbacks.onNodeClick?.(this.hoveredNodeId);
    }
  };

  private render = () => {
    if (this.layoutMode === 'sphere3d' && !this.selection.selectedNodeId) {
      this.group.rotation.y += 0.0011;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
