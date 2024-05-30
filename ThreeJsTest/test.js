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


// Initalize the scene and renderer
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0x000000, 1);

const player = new Player(scene);
const noise2D = createNoise2D(); // Assuming you have a function to create noise2D

const chunkSize = 16; // The chunk size in world units
const renderDistance = 2; // Number of chunks to render in each direction from the player
const activeChunks = new Map(); // Map chunk coordinates (Vector2) to their corresponding THREE.Mesh objects
const coordsToRemove = [];

const generateTerrainChunk = (chunkX, chunkZ) => {
    // Create a plane geometry with the desired size
    const planeGeometry = new THREE.PlaneGeometry(chunkSize, chunkSize,
                                                  chunkSize - 1, chunkSize - 1);
  
    // Access the vertices array from the plane geometry
    const vertices = planeGeometry.attributes.position.array;
  
    // Function to get noise value at given world coordinates
    const getNoiseValue = (worldX, worldY) => {
      return noise2D(worldX / 50, worldY / 50) * 10;
    };
  
    // Generate vertices for the chunk
    for (let z = 0; z < chunkSize; z++) {
      for (let x = 0; x < chunkSize; x++) {
        const worldX = chunkX * chunkSize + x;
        const worldY = chunkZ * chunkSize + z;
  
        const xPos = worldX - (chunkSize / 2);
        const yPos = worldY - (chunkSize / 2);
  
        // Calculate noise value for current position
        const noiseZ = getNoiseValue(worldX, worldY);
  
        const vertexIndex = z * chunkSize + x; // Calculate vertex index
        vertices[vertexIndex * 3] = xPos;
        vertices[vertexIndex * 3 + 1] = yPos;
        vertices[vertexIndex * 3 + 2] = noiseZ;
      }
    }

    // Generate colors for the vertices
    const colorsArray = generateVertexColors(planeGeometry);

    // Set vertex colors to the plane geometry
    planeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorsArray, 3));

    // Update the geometry to reflect changes in vertices and colors
    planeGeometry.computeVertexNormals();
    planeGeometry.computeBoundingSphere();

    return planeGeometry;
};

  
  


const createChunk = (newChunkCoords) => {
  const newChunkPos = new THREE.Vector2(newChunkCoords.x, newChunkCoords.y);
  const terrain = generateTerrainChunk(newChunkPos.x, newChunkPos.y);

  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
  //const material = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true }); // Adjust material properties as needed
  const terrainMesh = new THREE.Mesh(terrain, material);

  terrainMesh.rotateX(Math.PI / 2); // Assuming terrain needs rotation

  scene.add(terrainMesh);
  activeChunks.set(newChunkCoords, terrainMesh);
};

const generateChunks = () => {
  const playerChunkX = Math.floor(player.camera.position.x / chunkSize);
  const playerChunkY = Math.floor(player.camera.position.z / chunkSize);

  // Clear the removal dictionary
  coordsToRemove.length = 0;

  // Remove chunks outside of the render distance
  for (const [chunkCoords, chunkMesh] of activeChunks.entries()) {
    const distanceX = Math.abs(chunkCoords.x - playerChunkX);
    const distanceY = Math.abs(chunkCoords.y - playerChunkY);
    if (distanceX > renderDistance || distanceY > renderDistance) {
      // Mark chunks outside of the render distance for removal
      coordsToRemove.push(chunkCoords);
      scene.remove(chunkMesh);
    }
  }

  // Remove chunks marked for removal
  for (const chunkCoords of coordsToRemove) {
    activeChunks.delete(chunkCoords);
  }

  // Generate chunks within the render distance
  for (let x = playerChunkX - renderDistance; x <= playerChunkX + renderDistance; x++) {
    for (let y = playerChunkY - renderDistance; y <= playerChunkY + renderDistance; y++) {
      const newChunkCoords = new THREE.Vector2(x * 0.9, y * 0.9);
      if (!activeChunks.has(newChunkCoords)) {
        createChunk(newChunkCoords);
      }
    }
  }
};


// Intropolate colors based on the y value.
// This eases the colors based on y height 
const interpolateColor = (value, color1, color2) => {
    const thresholdY = 0;
    const t = (value - thresholdY) / (1 - thresholdY);
    return new THREE.Color().lerpColors(color1, color2, t);
}


const generateVertexColors = (geometry) => {
    const thresholdY = 0;

    // Create an array to store the colors for different regions
    const colors = {
        belowThreshold: new THREE.Color(0x8B4513),
        aboveThreshold: new THREE.Color(0x1E90FF)
    };

    // Iterate through the vertices of the plane geometry
    const positions = geometry.attributes.position;
    const numVertices = positions.count;
    const colorsArray = [];

    for(let vertexIndex = 0; vertexIndex < numVertices; vertexIndex++) {
        
        // Get the Z coordinate of the current vertex
        const vertexZ = positions.getZ(vertexIndex);

        // Determine the color for the vertex based on its Z value and neighboring vertices
        let color;
        if(vertexZ < thresholdY) {
            // Color for regions below the threshold
            color = colors.belowThreshold;
        } 
        else {
            // Color for regions above the threshold
            const neighborZ = [];
            
            // Get Z coordinate of neighboring vertices
            const xIndex = vertexIndex % chunkSize;
            const yIndex = Math.floor(vertexIndex / chunkSize);

            // Loop
            for(let xOffset = -1; xOffset <= 1; xOffset++) {
                for(let yOffset = -1; yOffset <= 1; yOffset++) {
                    const neighborIndex = (yIndex + yOffset) * chunkSize +
                                                             (xIndex + xOffset);
                    
                    // Check the neighboring index
                    if(neighborIndex >= 0 && neighborIndex < numVertices) {
                        neighborZ.push(positions.getZ(neighborIndex));
                    }
                }
            }

            // Interpolate colors based on the height values of neighboring vertices
            const totalZ = neighborZ.reduce((acc, val) => acc + val, 0)
                                                                      + vertexZ;
            
            // Get the average z value 
            const avgZ = totalZ / (neighborZ.length + 1);
            
            // Get the height based color based on neighboring values 
            color = interpolateColor(avgZ, colors.belowThreshold, 
                                                         colors.aboveThreshold);
        }

        // Add the color to the colors array
        colorsArray.push(color.r, color.g, color.b);
    }
    return colorsArray;  
}

for(let x = -2; x < 2; x++) {
    for(let y = -2; y < 2; y++ ) {
        createChunk(new THREE.Vector2(x * 0.9,y * 0.9));
    }
}


let clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    let delta = clock.getDelta(); // Get the time elapsed since the last frame
    player.update(delta,scene); // Pass delta to the update method
    generateChunks();
    renderer.render(scene, player.camera);
}

animate();


