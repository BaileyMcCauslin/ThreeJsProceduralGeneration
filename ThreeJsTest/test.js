import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { Wireframe } from 'three/examples/jsm/Addons.js';

const zSpeed = 3.0;
const FOV = 75;
const NEAR = 0.1;
const FAR = 1000;

class Player {
    constructor(scene) {
        // Initialize the player's position
        this.position = new THREE.Vector3(0, 10, 5);
        this.scene = scene;

        // Initialize the player camera
        this.camera = new THREE.PerspectiveCamera(FOV, 
                             window.innerWidth / window.innerHeight, NEAR, FAR);
        this.camera.position.copy(this.position);
        this.camera.rotation.order = "YXZ";

        // Create a model for the player. DOES THIS CHANGE COLLISION DETECTION? 
        const geometry = new THREE.CapsuleGeometry( 1, 1, 4, 8 ); 
        const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} ); 
        this.model = new THREE.Mesh( geometry, material );
        this.scene.add(this.model);
        this.model.position.copy(this.position);


        // Store a reference to the player object
        const self = this;
        
        // Key state tracking
        this.keys = {};

        // Listen for keyboard presses and releases
        document.addEventListener("keydown", function(event) {
            self.keys[event.code] = true;
        }, false);
        document.addEventListener("keyup", function(event) {
            self.keys[event.code] = false;
        }, false);
        
        // Listen for mouse movement
        document.addEventListener('mousemove', function(event) {
            self.onMouseMove(event);
        }, false);

        // Set the player's health
        this.health = 150;

        // Initialize if the player is on the ground or not
        this.isGrounded = true;

        // Initialize the user's alive status
        this.isAlive = true;

        // Initialize a jump velocity for the player 
        this.jumpVelocity = 6;

        // Initialize gravity for the player 
        this.gravity = 10;

        // Set the velocity of the player
        this.velocity = new THREE.Vector3();
        this.horizontalVelocity = new THREE.Vector3();

        // Initialize the jumping movement
        this.jumping = false;

        // Create a raycaster for ground detection
        this.raycaster = new THREE.Raycaster();
    }

    // Detect mouse movements to rotate the camera 
    onMouseMove(event) {
        const movementX = event.movementX || event.mozMovementX || 
                                                     event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || 
                                                     event.webkitMovementY || 0;

        const sensitivity = 0.005;

        this.camera.rotation.y -= movementX * sensitivity;
        this.camera.rotation.x -= movementY * sensitivity;

        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, 
                                                       this.camera.rotation.x));
        this.model.rotation.y = this.camera.rotation.y;
    }

    // Set alive state
    setAliveState(state) {
        this.isAlive = state;
    }

    // Set health 
    setHealth(health) {
        this.health = health;
    }

    // Make player take damage
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.setAliveState(false);
        }
    }

    getGrounded() {
        return this.isGrounded;
    }

    setGrounded(state) {
        this.isGrounded = state;
    }

    // Move the player according to keyboard input
    processInput(delta) {
        this.horizontalVelocity.set(0, 0, 0); // Reset horizontal velocity
    
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
    
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
    
        right.crossVectors(forward, this.camera.up).normalize();
    
        const directionVectors = {
            forward: forward,
            backwards: forward.clone().negate(),
            right: right,
            left: right.clone().negate()
        };

        const isCollision = (direction) => {
            this.raycaster.set(this.position, direction);
            const intersections = this.raycaster.intersectObjects(
                                                     this.scene.children, true);
            return intersections.length === 0 || intersections[0].distance > 1;
        };
        
    
        if(this.keys['KeyW'] && isCollision(directionVectors.forward)) {
            this.horizontalVelocity.add(forward);
        }
        if(this.keys['KeyS'] && isCollision(directionVectors.backwards)) {
            this.horizontalVelocity.sub(forward);
        }
        if(this.keys['KeyA'] && isCollision(directionVectors.left)) {
            this.horizontalVelocity.sub(right);
        }
        if(this.keys['KeyD'] && isCollision(directionVectors.right)) {
            this.horizontalVelocity.add(right);
        }

    
        // Normalize the horizontal velocity vector to maintain consistent speed
        if (this.horizontalVelocity.length() > 0) {
            this.horizontalVelocity.normalize().multiplyScalar(zSpeed);
        }
    
        if (this.keys['Space']) {
            this.jump();
        }
    }

    // Initialize the jump mechanic
    jump() {
        if (this.getGrounded() && !this.jumping) {
            this.jumping = true;
            this.velocity.y = this.jumpVelocity;
        }
    }

    // Update the player every frame
    update(delta,scene) {
        this.processInput(delta);

        // Check for ground using raycasting.
        this.raycaster.set(this.position, new THREE.Vector3(0, -1, 0));

        // Check for ray hits
        const intersects = this.raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0 && intersects[0].distance <= 1.1) {
            this.setGrounded(true);
            this.jumping = false;
            this.position.y = intersects[0].point.y + 1;
        } 
        else {
            this.setGrounded(false);
            this.velocity.y -= this.gravity * delta;
        }

        // Apply horizontal movement
        this.position.addScaledVector(this.horizontalVelocity, delta);

        // Apply vertical movement
        this.position.y += this.velocity.y * delta;

        // Update the camera position
        this.updateCameraPosition(this.position);
        this.model.position.copy(this.position);
    }

    // Update camera position
    updateCameraPosition(newPosition) {
        this.camera.position.copy(newPosition);
        this.camera.position.y += 2;
    }

    // Set player position
    setPosition(newPosition) {
        this.position.copy(newPosition);
    }
}

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0x000000, 1);

const player = new Player(scene);

const chunkSize = 100; // Define the size of each terrain chunk
const numChunksInView = 3; // Number of chunks visible in each direction from the camera
const loadDistance = chunkSize * numChunksInView;

const loadedChunks = {};

const noise2D = createNoise2D();

// Function to check if a chunk already exists or needs to be generated
function chunkExists(chunkX, chunkY) {
    return loadedChunks[chunkX] && loadedChunks[chunkX][chunkY];
}

// Function to mark a chunk as loaded
function markChunkLoaded(chunkX, chunkY) {
    if (!loadedChunks[chunkX]) {
        loadedChunks[chunkX] = {};
    }
    loadedChunks[chunkX][chunkY] = true;
}

// Function to mark a chunk as unloaded
function markChunkUnloaded(chunkX, chunkY) {
    if (loadedChunks[chunkX]) {
        delete loadedChunks[chunkX][chunkY];
    }
}

// Function to remove chunks that are out of view
function removeChunksOutOfView() {
    const playerChunkX = Math.floor(player.camera.position.x / chunkSize);
    const playerChunkY = Math.floor(player.camera.position.y / chunkSize);

    for (const chunkX in loadedChunks) {
        for (const chunkY in loadedChunks[chunkX]) {
            if (
                Math.abs(chunkX - playerChunkX) > numChunksInView || // Check X distance
                Math.abs(chunkY - playerChunkY) > numChunksInView    // Check Y distance
            ) {
                // Remove the chunk from the scene and mark it as unloaded
                console.log("Deleting chunk");
                scene.remove(loadedChunks[chunkX][chunkY].terrainMesh);
                markChunkUnloaded(chunkX, chunkY);
            }
        }
    }
}

// Function to interpolate color between two colors based on a value
function interpolateColor(value, color1, color2) {
    const thresholdY = 0;
    const t = (value - thresholdY) / (1 - thresholdY);
    return new THREE.Color().lerpColors(color1, color2, t);
}

// Function to generate terrain geometry for a given chunk
// Function to generate terrain geometry for a given chunk
function generateTerrainChunk(chunkX, chunkY) {
    const vertices = [];
    const indices = [];
    const thresholdY = 0;

    // Create an array to store the colors for different regions
    const colors = {
        belowThreshold: new THREE.Color(0x8B4513), // Color for regions below the threshold
        aboveThreshold: new THREE.Color(0x1E90FF)   // Default color for regions above the threshold
    };

    for (let y = 0; y < chunkSize; y++) {
        for (let x = 0; x < chunkSize; x++) {
            const worldX = chunkX * chunkSize + x;
            const worldY = chunkY * chunkSize + y;

            const xPos = worldX - (chunkSize / 2);
            const yPos = worldY - (chunkSize / 2);

            // Apply simplex noise to the vertex position
            const noiseValue = noise2D(xPos / 50, yPos / 50) * 5;
            const amplitude = 1;
            const noiseZ = noiseValue * amplitude;

            vertices.push(xPos, yPos, noiseZ);
        }
    }

    for (let y = 0; y < chunkSize - 1; y++) {
        for (let x = 0; x < chunkSize - 1; x++) {
            const a = x + chunkSize * y;
            const b = x + chunkSize * (y + 1);
            const c = (x + 1) + chunkSize * (y + 1);
            const d = (x + 1) + chunkSize * y;

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    geometry.setIndex(indices);

    // Iterate through the vertices of the plane geometry
    const positions = geometry.attributes.position;
    const numVertices = positions.count;
    const colorsArray = [];
    for (let i = 0; i < numVertices; i++) {
        // Get the Z coordinate of the current vertex
        const vertexZ = positions.getZ(i);

        // Determine the color for the vertex based on its Z value and neighboring vertices
        let color;
        if (vertexZ < thresholdY) {
            // Color for regions below the threshold
            color = colors.belowThreshold;
        } else {
            // Color for regions above the threshold
            const neighborZ = [];
            // Get Z coordinate of neighboring vertices
            const xIndex = i % chunkSize;
            const yIndex = Math.floor(i / chunkSize);
            for (let xOffset = -1; xOffset <= 1; xOffset++) {
                for (let yOffset = -1; yOffset <= 1; yOffset++) {
                    const neighborIndex = (yIndex + yOffset) * chunkSize + (xIndex + xOffset);
                    if (neighborIndex >= 0 && neighborIndex < numVertices) {
                        neighborZ.push(positions.getZ(neighborIndex));
                    }
                }
            }
            // Interpolate colors based on the height values of neighboring vertices
            const totalZ = neighborZ.reduce((acc, val) => acc + val, 0) + vertexZ;
            const avgZ = totalZ / (neighborZ.length + 1);
            color = interpolateColor(avgZ, colors.belowThreshold, colors.aboveThreshold);
        }

        // Add the color to the colors array
        colorsArray.push(color.r, color.g, color.b);
    }

    // Create a buffer attribute for vertex colors
    const colorsAttribute = new THREE.BufferAttribute(new Float32Array(colorsArray), 3);

    // Set the colors attribute to the plane geometry
    geometry.setAttribute('color', colorsAttribute);

    return geometry;
}

// Function to generate terrain chunks around the player
function generateTerrainChunks() {
    const playerChunkX = Math.floor(player.camera.position.x / chunkSize);
    const playerChunkY = Math.floor(player.camera.position.y / chunkSize);

    for (let x = playerChunkX - numChunksInView; x <= playerChunkX + numChunksInView; x++) {
        for (let y = playerChunkY - numChunksInView; y <= playerChunkY + numChunksInView; y++) {
            if (!chunkExists(x, y)) { // Check if chunk already exists or needs to be generated
                const terrainGeometry = generateTerrainChunk(x, y);
                const material = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });

                // Calculate the world position of the chunk
                const chunkWorldPosX = x / chunkSize;
                const chunkWorldPosY = y / chunkSize;

                const terrainMesh = new THREE.Mesh(terrainGeometry, material);
                
                // Set the position of the chunk
                terrainMesh.position.set(chunkWorldPosX, 0, chunkWorldPosY);
                
                // Rotate the chunk to align with the terrain
                terrainMesh.rotateX(Math.PI / 2);
                
                scene.add(terrainMesh);
                markChunkLoaded(x, y); // Mark the chunk as loaded
            }
        }
    }
    
    // Remove distant chunks
    removeChunksOutOfView();
}


let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    let delta = clock.getDelta(); // Get the time elapsed since the last frame
    player.update(delta,scene); // Pass delta to the update method
    generateTerrainChunks();
    renderer.render(scene, player.camera);
}

animate();


