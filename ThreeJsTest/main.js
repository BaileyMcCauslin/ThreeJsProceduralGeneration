import * as THREE from 'three';
// import the noise functions you need
import { createNoise2D } from 'simplex-noise';// Example import based on the library's actual export name

const wKey = 87;
const sKey = 83;
const aKey = 65;
const dKey = 68;
const spaceKey = 32;
const backKey = 8;
const xSpeed = 1.0;
const ySpeed = 1.0;
const zSpeed = 1.0;

class World {
    constructor() {

    }

    renderChunk() {
        
    }
}

class GameState {
    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.player = new Player(this);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);
        this.renderer.setClearColor(0xffffff, 0);
        this.blocks = [];
    }
}

class Player {
    constructor(gameState) {
        this.gameState = gameState;
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth /
                                                window.innerHeight, 0.1, 1000 );
        this.camera.rotation.order = "YXZ";
        this.camera.position.y = 64;
        this.alive = true;
        this.grounded = true;
        this.health = 150;
        this.location = {'x':0,'y':0,'z':0.5};
        const self = this;
        document.addEventListener("keydown", function(event) {
            self.movePlayer(event);
        }, false);
        document.addEventListener('mousemove', function(event) {
            self.onMouseMove(event);
        },false);
    }

    checkCollision(point,blockPos) {
        return(
            point.x >= blockPos.x &&
            point.x <= blockPos.x + .01 &&
            point.y >= blockPos.y &&
            point.y <= blockPos.y + .01 &&
            point.z >= blockPos.z &&
            point.z <= blockPos.z + .01);
    }

    onMouseMove(event) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    
        const sensitivity = 0.05; // Adjust sensitivity as needed
    
        // Update yaw (horizontal rotation) based on mouse movement along x-axis
        this.camera.rotation.y -= movementX * sensitivity;
    
        // Update pitch (vertical rotation) based on mouse movement along y-axis
        this.camera.rotation.x -= movementY * sensitivity;
    
        // Clamp the pitch angle to avoid flipping the camera
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
    }
    
    movePlayer(event) {
        const key = event.which;
        const targetPosition = this.camera.position.clone();
        switch(key) {
            case wKey:
                targetPosition.z -= zSpeed;
                break;
            case sKey:
                targetPosition.z += zSpeed;
                break;
            case aKey:
                targetPosition.x -= xSpeed;
                break;
            case dKey:
                targetPosition.x += xSpeed;
                break;
            // Todo: Gravity
            case spaceKey:
                targetPosition.y += ySpeed;
                break;
            case backKey:
                targetPosition.y -= ySpeed;
                break;
        }

        let collision = false;
        for(const block in gameState.blocks) {
            if(this.checkCollision(targetPosition,
                                       gameState.blocks[block].getPosition())) {
                collision = true;
            }
        }

        if(!collision) {
            const lerpAmount = 0.1; // Adjust the lerp amount for desired speed
            this.camera.position.lerp(targetPosition, lerpAmount);
        }
    }
}

const blockWidth = 1;
const blockHeight = 1;
const blockDepth = 1;

class Block {
    constructor(renderer,type,xPos,yPos,zPos) {
        this.renderer = renderer;
        this.geometry = new THREE.BoxGeometry(blockWidth,blockHeight,
                                                                    blockDepth);
        this.material = this.loadMaterial();
        this.material.side = THREE.FrontSide; 
        this.cube = new THREE.Mesh(this.geometry, this.material); 
        this.cube.position.set(xPos,yPos,zPos);
        this.active = true;
        this.type = type;
    }

    getPosition() {
        return this.cube.position;
    }

    setPosition(xPos,yPos,zPos) {
        this.cube.position.set(xPos,yPos,zPos);
    }

    setActive(active) {
        this.active = active;
    }

    loadMaterial() {
        const loader = new THREE.TextureLoader();

        // Load the texture
        const texture = loader.load('textures/blocks/grasstop.png');
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

        // Return the material with the loaded texture
        return new THREE.MeshBasicMaterial({ map: texture });
    }
}

const gameState = new GameState();

// Define terrain parameters
const terrainWidth = 64;
const terrainDepth = 64;

// Create a voxel grid to represent the terrain
const voxelGrid = new Map(); // Use a Map for better performance than nested arrays

const noise2D = createNoise2D();

// Function to add a block to the voxel grid
function addBlockToGrid(x, y, z) {
    const key = `${x},${y},${z}`;
    voxelGrid.set(key, true);
}

// Generate terrain heights using Perlin noise
for (let x = 0; x < terrainWidth; x++) {
    for (let z = 0; z < terrainDepth; z++) {
        const noiseValue = noise2D(x / 50, z / 50) * 5; // Adjust frequency and amplitude as needed
        const height = Math.ceil(noiseValue); // Round up to the nearest integer
        for (let y = -12; y < height; y++) {
            addBlockToGrid(x, y, z);
        }
    }
}

// Function to check if a block is occupied in the voxel grid
function isBlockOccupied(x, y, z) {
    const key = `${x},${y},${z}`;
    return voxelGrid.has(key);
}

// Create blocks for the terrain
for (let x = 0; x < terrainWidth; x++) {
    for (let y = -12; y < terrainDepth; y++) {
        for (let z = 0; z < terrainDepth; z++) {
            if (isBlockOccupied(x, y, z)) {
                const block = new Block(gameState.renderer, "grass", x, y, z);
                gameState.scene.add(block.cube);
            }
        }
    }
}

// Function to check if an object is inside the camera's frustum
function createBoundingBox(object) {
    const box = new THREE.Box3().setFromObject(object);
    return box;
}

// Function to check if an object is inside the camera's frustum
function isObjectInFrustum(object, camera) {
    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
    const boundingBox = createBoundingBox(object);
    return frustum.intersectsBox(boundingBox);
}


// Update visibility based on frustum culling
function updateVisibility(gameState) {
    gameState.scene.traverse(object => {
        if (object.isMesh) {
            object.visible = isObjectInFrustum(object, gameState.player.camera);
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    updateVisibility(gameState);
    gameState.renderer.render(gameState.scene, gameState.player.camera);
}

animate();
