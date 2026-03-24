import * as THREE from 'three';

export type ShapeName = 'Box' | 'Sphere' | 'Torus' | 'Octahedron' | 'Icosahedron' | 'Cone';

interface SceneObject {
  mesh: THREE.Mesh;
  wire: THREE.Mesh;
}

function createGeometry(shape: ShapeName): THREE.BufferGeometry {
  switch (shape) {
    case 'Box':         return new THREE.BoxGeometry(1.4, 1.4, 1.4);
    case 'Sphere':      return new THREE.SphereGeometry(0.9, 64, 64);
    case 'Torus':       return new THREE.TorusGeometry(0.8, 0.32, 32, 100);
    case 'Octahedron':  return new THREE.OctahedronGeometry(1.1);
    case 'Icosahedron': return new THREE.IcosahedronGeometry(1.0);
    case 'Cone':        return new THREE.ConeGeometry(0.9, 1.8, 64);
    default:            return new THREE.BoxGeometry(1.4, 1.4, 1.4);
  }
}

export class Scene3D {
  private renderer: THREE.WebGLRenderer;
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;
  private objects:  SceneObject[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    const ambientLight = new THREE.AmbientLight(0x112244, 1.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 3, 20);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4488ff, 2, 20);
    pointLight2.position.set(-5, -3, 3);
    this.scene.add(pointLight2);

    const rimLight = new THREE.DirectionalLight(0x002255, 1);
    rimLight.position.set(0, -5, -5);
    this.scene.add(rimLight);

    // Start with one default object
    this.addObject('Torus', '#00d4ff');

    window.addEventListener('resize', () => this.onResize());
  }

  get objectCount(): number { return this.objects.length; }

  addObject(shape: ShapeName, colorHex: string): void {
    const color = parseInt(colorHex.replace('#', ''), 16);
    const geo   = createGeometry(shape);
    const mat   = new THREE.MeshPhongMaterial({
      color,
      emissive: new THREE.Color(color).multiplyScalar(0.15),
      shininess: 120,
      specular: 0xffffff,
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color, wireframe: true, transparent: true, opacity: 0.18,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const wire = new THREE.Mesh(geo.clone(), wireMat);
    this.scene.add(mesh);
    this.scene.add(wire);
    this.objects.push({ mesh, wire });
  }

  removeObject(index: number): void {
    if (index < 0 || index >= this.objects.length) return;
    const { mesh, wire } = this.objects[index];
    this.scene.remove(mesh);
    this.scene.remove(wire);
    mesh.geometry.dispose();
    wire.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    (wire.material as THREE.Material).dispose();
    this.objects.splice(index, 1);
  }

  updateObjects(
    states: { posX: number; posY: number; rotX: number; rotY: number; rotZ: number }[],
  ): void {
    for (let i = 0; i < Math.min(states.length, this.objects.length); i++) {
      const { mesh, wire } = this.objects[i];
      const s = states[i];
      mesh.position.set(s.posX, s.posY, 0);
      wire.position.set(s.posX, s.posY, 0);
      mesh.rotation.set(s.rotX, s.rotY, s.rotZ);
      wire.rotation.set(s.rotX, s.rotY, s.rotZ);
    }
  }

  setObjectShape(index: number, shape: ShapeName): void {
    if (index < 0 || index >= this.objects.length) return;
    const geo = createGeometry(shape);
    const { mesh, wire } = this.objects[index];
    mesh.geometry.dispose();
    mesh.geometry = geo;
    wire.geometry.dispose();
    wire.geometry = geo.clone();
  }

  setObjectColor(index: number, hex: string): void {
    if (index < 0 || index >= this.objects.length) return;
    const color = parseInt(hex.replace('#', ''), 16);
    const { mesh, wire } = this.objects[index];
    (mesh.material as THREE.MeshPhongMaterial).color.setHex(color);
    (mesh.material as THREE.MeshPhongMaterial).emissive.setHex(color).multiplyScalar(0.15);
    (wire.material as THREE.MeshBasicMaterial).color.setHex(color);
  }

  setFov(fov: number): void {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
