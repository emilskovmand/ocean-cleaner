import "./style.css";

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { nanoid } from "nanoid";

let camera, scene, renderer;
let controls, water, sun, frustum, cameraViewProjectionMatrix, raycaster, mousePointer;

let KeyActive = {
    up: false,
    down: false,
    left: false,
    right: false,
    leftClick: false,
    rightClick: false,
};

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
var baseTexture = textureLoader.load("assets/boat-2/textures/boat_baseColor.png");
var normalTexture = textureLoader.load("assets/boat-2/textures/boat_normal.png");
var metalnessTexture = textureLoader.load("assets/boat-2/textures/boat_metallicRoughness.png");

function random(min, max) {
    return Math.random() * (max - min) + min;
}

class Boat {
    constructor() {
        loader.load("assets/boat-2/scene.gltf", (gltf) => {
            scene.add(gltf.scene);
            gltf.scene.scale.set(0.05, 0.05, 0.05);
            gltf.scene.position.set(5, -0.12, 50);
            gltf.scene.rotation.y = 0.5;
            gltf.scene.normal;
            gltf.scene.traverse((o) => {
                if (o.isMesh) {
                    o.material.normalMap = normalTexture;
                    o.material.map = baseTexture;
                    o.material.metalnessMap = metalnessTexture;
                }
            });

            this.boat = gltf.scene;
            this.speed = {
                vel: 0,
                rot: 0,
            };
        });
    }

    stop() {
        this.speed.vel = 0;
        this.speed.rot = 0;
    }

    update() {
        if (this.boat) {
            this.boat.rotation.y += this.speed.rot;
            this.boat.translateZ(-this.speed.vel);
        }
    }
}

const boat = new Boat();

class Trash {
    dissapearing = false;
    id = undefined;
    removed = false;
    seen = false;
    lastDistanceToBoat = 0;
    uuid = undefined;

    constructor(_scene) {
        this.id = nanoid(24);
        scene.add(_scene);
        this.uuid = _scene.uuid;
        let randomNumber = random(0, 100);
        let yCoordinate = 0.5;

        if (_scene.name === "Garbage Bag") {
            _scene.scale.set(1, 1, 1);
            yCoordinate = 0.5;
        }
        if (_scene.name === "Old_Sink") {
            _scene.scale.set(0.1, 0.1, 0.1);
            yCoordinate = 1;
        }
        if (_scene.name === "Jerrycan") {
            _scene.scale.set(10, 10, 10);
            yCoordinate = 0.5;
        }
        if (_scene.name === "Sneakers") {
            _scene.scale.set(100, 100, 100);
            yCoordinate = 7.5;
        }

        if (_scene.name === "Barrels") {
            _scene.scale.set(0.5, 0.5, 0.5);
            yCoordinate = -1;
        }

        if (randomNumber < 25) {
            // North side spawn area
            _scene.position.set(random(150, -150), yCoordinate, random(-15, -65));
            this.velocityZ = random(0.05, 0.2);
            this.velocityY = random(-0.1, 0.2);
        } else if (randomNumber < 50) {
            // East side spawn area
            _scene.position.set(random(120, 160), yCoordinate, random(-100, 200));
            this.velocityZ = random(-0.1, 0.1);
            this.velocityY = random(-0.2, -0.1);
        } else if (randomNumber < 75) {
            // South side spawn area
            _scene.position.set(random(150, -150), yCoordinate, random(115, 165));
            this.velocityZ = random(-0.1, -0.2);
            this.velocityY = random(0.1, -0.1);
        } else {
            // West side spawn area
            _scene.position.set(random(-120, -160), yCoordinate, random(-100, 200));
            this.velocityZ = random(-0.1, 0.1);
            this.velocityY = random(0.2, 0.1);
        }

        this.trash = _scene;
    }

    update() {
        this.trash.translateZ(this.velocityZ);
        this.trash.translateX(this.velocityY);

        if (this.dissapearing == false) {
            if (!frustum.containsPoint(this.trash.position)) {
                if (this.seen) {
                    this.dissapearing = true;
                    setTimeout(() => {
                        scene.remove(this.trash);
                        this.removed = true;
                    }, 1000);
                } else {
                    let boatPostion = boat.boat.position;
                    let trashPosition = this.trash.position;
                    if (this.lastDistanceToBoat == 0) {
                        this.lastDistanceToBoat = boatPostion.distanceTo(trashPosition);
                    } else {
                        let currentDistance = boatPostion.distanceTo(trashPosition);
                        if (currentDistance > this.lastDistanceToBoat) {
                            this.dissapearing = true;
                            this.removed = true;
                            scene.remove(this.trash);
                        } else {
                            this.lastDistanceToBoat = currentDistance;
                        }
                    }
                }
            } else {
                this.seen = true;
            }
        }
    }
}

async function loadModel(url) {
    return new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
            resolve(gltf.scene);
        });
    });
}

let boatModel,
    barrelModel,
    jerrycanModel,
    oldSinkModel,
    sneakerModel,
    oldTorchModel = null;

async function createTrash() {
    if (!boatModel) {
        boatModel = await loadModel("assets/trash/scene.gltf");
    }
    return new Trash(boatModel.clone());
}
async function createBarrels() {
    if (!barrelModel) {
        barrelModel = await loadModel("assets/barrels/scene.gltf");
    }
    return new Trash(barrelModel.clone());
}
async function createJerrycan() {
    if (!jerrycanModel) {
        jerrycanModel = await loadModel("assets/jerrycan/scene.gltf");
    }
    return new Trash(jerrycanModel.clone());
}
async function createOldSink() {
    if (!oldSinkModel) {
        oldSinkModel = await loadModel("assets/old_sink/scene.gltf");
    }
    return new Trash(oldSinkModel.clone());
}
async function createSneakers() {
    if (!sneakerModel) {
        sneakerModel = await loadModel("assets/sneakers/scene.gltf");
        console.log(sneakerModel);
    }
    return new Trash(sneakerModel.clone());
}

let trashes = [];
let trashesHovered = [];
const TRASH_COUNT = 150;
let boolTest = true;

init();
animate();

async function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
    camera.position.set(5, 100, 50);
    const ambientLight = new THREE.AmbientLight(0x404040, 1); // soft white light
    scene.add(ambientLight);

    frustum = new THREE.Frustum();
    cameraViewProjectionMatrix = new THREE.Matrix4();
    raycaster = new THREE.Raycaster();
    mousePointer = new THREE.Vector2(0, 0);

    sun = new THREE.Vector3();

    // Water

    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load("assets/waternormals.jpg", function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined,
    });

    water.rotation.x = -Math.PI / 2;

    scene.add(water);

    // Skybox

    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;

    const parameters = {
        elevation: 2,
        azimuth: 170,
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    function updateSun() {
        const phi = THREE.MathUtils.degToRad(80 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms["sunPosition"].value.copy(sun);
        water.material.uniforms["sunDirection"].value.copy(sun).normalize();

        scene.environment = pmremGenerator.fromScene(sky).texture;
    }

    updateSun();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(5, -0.12, 50);
    controls.minDistance = 40.0;
    controls.maxDistance = 200.0;
    // controls.enabled = false;
    controls.update();

    const waterUniforms = water.material.uniforms;

    for (let i = 0; i < TRASH_COUNT; i++) {
        const randomNumber = Math.floor(Math.random() * 5);
        switch (randomNumber) {
            case 0:
                const trash = await createTrash();
                trashes.push(trash);
                break;
            case 1:
                const barrels = await createBarrels();
                trashes.push(barrels);
                break;
            case 2:
                const jerrycan = await createJerrycan();
                trashes.push(jerrycan);
                break;
            case 3:
                const oldsink = await createOldSink();
                trashes.push(oldsink);
                break;
            case 4:
                const sneakers = await createSneakers();
                trashes.push(sneakers);
                break;
        }
    }

    window.addEventListener("resize", onWindowResize);

    window.addEventListener("keydown", function (ev) {});
    window.addEventListener("keyup", function (ev) {});
    window.addEventListener("mousedown", (ev) => {
        if (ev.button == 1) {
            // left Mouse Button
            KeyActive.leftClick = true;
        } else if (ev.button == 1) {
            // Right Mouse Button
            KeyActive.leftClick = true;
        }
    });
    window.addEventListener("mouseup", (ev) => {
        if (ev.button == 1) {
            // left Mouse Button
            KeyActive.leftClick = false;
        } else if (ev.button == 1) {
            // Right Mouse Button
            KeyActive.leftClick = false;
        }
    });
    window.addEventListener("mousemove", (ev) => {
        mousePointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
        mousePointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function debounce(func, timeout = 1000 / 60) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

function CheckWithinViewbox() {
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
}

function RaycasterRender() {
    raycaster.setFromCamera(mousePointer, camera);
    trashesHovered = raycaster.intersectObjects(
        trashes.map((x) => x.trash),
        true
    );

    if (trashesHovered.length > 0) {
        // const object = trashes.filter((x) => x.trash.children[0].children[0].children[0].children[0].children[0].uuid == trashesHovered[0].object.uuid)[0];
        // console.log(object);
        // object.removed = true;
        // scene.remove(object.trash);
    }
}

function animate() {
    requestAnimationFrame(debounce(animate));
    render();
    boat.update();
    CheckWithinViewbox();
    RaycasterRender();

    for (let i = 0; i < trashes.length; i++) {
        trashes[i].update();
    }
    trashes = trashes.filter((x) => x.removed == false);
    if (boatModel != null) {
        while (trashes.length <= TRASH_COUNT) {
            const trash = new Trash(boatModel.clone());
            trashes.push(trash);
        }
    }

    if (boolTest && trashes.length > 0) {
        boolTest = false;
        console.log(trashes);
    }
}

function render() {
    water.material.uniforms["time"].value += 1.0 / 60.0;

    renderer.render(scene, camera);
}
