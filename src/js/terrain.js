import * as THREE from 'three';
import {createNoise2D} from 'simplex-noise';

export class TerrainGenerator{
    constructor(scene,player) {

        // The size of a chunk in terms of vertices in x and z directions;
        this.chunkSize = 16;

        // Reference to the three js scene
        this.scene = scene;

        // Reference to the player for camera position
        this.player = player;

        // Reference a 2D simplex noise funtion
        this.noise2D = createNoise2D();
        
        // Parameters for simplex noise calculation
        this.noiseParams = {
            divisor: 50,
            amplitude: 20,
        }

        // Number of chunks we want in each direction at one time
        this.renderDistance = 2;
        
        // Active chunks in our scene
        this.activeChunks = new Map();
        
        // Coordinates for removing a chunk from the chunk map
        this.coordsToRemove = [];
        
        // Make the mesh a wirefrane
        this.wireframe = true;

        // Give a vertex in the chunk its own color 
        this.vertexColors = true;
        
        // Offset for the chunk vertices. This stitches meshes together
        this.chunkOffset = 0.9365;

        // Threshold where colors flip in terrain
        // TODO: Make an object for multiple thresholds
        this.colorYThresHold = 0;

        // Declare the colors for the mesh vertices
        this.colors = {
            belowThreshold: new THREE.Color(0x8B4513), // Blusish color
            aboveThreshold: new THREE.Color(0x1E90FF) // Brownish color
        };
    }

    generateTerrainChunk(chunkX, chunkZ) {
        // Segments on each size of the chunk
        const segmentSize = this.chunkSize - 1;

        // Create a plane geometry with the corresponding sizes.
        const planeGeometry = new THREE.PlaneGeometry(this.chunkSize, 
                                      this.chunkSize, segmentSize, segmentSize);

        // Access the vertices array from the plane geometry
        const vertices = planeGeometry.attributes.position.array;

        // Function to get noise value at given world coordinates
        const getNoiseValue = (worldX, worldY) => {
            // Get the height based on simplex noise and it's parameters.
            return this.noise2D(worldX / this.noiseParams.divisor, worldY / 
                         this.noiseParams.divisor) * this.noiseParams.amplitude;
        };

        // Generate vertices for the chunk
        for(let z = 0; z < this.chunkSize; z++) {
            for(let x = 0; x < this.chunkSize; x++) {
                // Get the chunk location in our three js scene
                const worldX = chunkX * this.chunkSize + x;
                const worldY = chunkZ * this.chunkSize + z;

                // Get the positions of the new vertices for the chunk
                const chunkOffset = this.chunkSize / 2;
                const xPos = worldX - chunkOffset;
                const yPos = worldY - chunkOffset;

                // Get the noise for our triangle vertex
                const noiseZ = getNoiseValue(worldX, worldY);

                // Get the index for the vertex set in the current chunk plane
                const vertexIndex = z * this.chunkSize + x;
                const triangleIndex = vertexIndex * 3;

                // Set triangle vertex poisitions
                vertices[triangleIndex] = xPos;
                vertices[triangleIndex + 1] = yPos;
                vertices[triangleIndex + 2] = noiseZ;
            }
        }

        // Refresh the geometry in the three js scene
        return this.refreshPlaneGeometry(planeGeometry);
    }

    refreshPlaneGeometry(geometry) {
        // Check if we want to create vertex colors
        if(this.vertexColors) {
            
            // Get the colors for each vertex
            const colorsArray = this.generateVertexColors(geometry);

            // Set the color array for the plane geometry
            geometry.setAttribute('color', 
                              new THREE.Float32BufferAttribute(colorsArray, 3));
        }

        // Refresh the geometry 
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        return geometry;
    }

    createChunk(newChunkCoords) {
        // Generate the new chunk geometry at the position
        const terrain = this.generateTerrainChunk(newChunkCoords.x, 
                                                              newChunkCoords.y);
        
        // Create the material for the new chunk mesh
        const material = new THREE.MeshBasicMaterial({color: 0xffffff,
                   vertexColors: this.vertexColors, wireframe: this.wireframe});

        // Create the mesh for the chunk
        const terrainMesh = new THREE.Mesh(terrain, material);

        // Rotate the chunk plane around the x axis to emulate ground
        terrainMesh.rotateX(Math.PI / 2);
      
        // Add the chunk to the scene and active chunk map
        this.scene.add(terrainMesh);
        this.activeChunks.set(newChunkCoords, terrainMesh);
    }

    // Generate chunks based on player location
    generateChunks() {

        // Get the chunk the player is currently on
        const getPlayerChunk = () => {
            return[Math.floor(this.player.camera.position.x / this.chunkSize),
                    Math.floor(this.player.camera.position.z / this.chunkSize)];
        }

        // Get the active chunk distance from player chunk
        const getChunkDistanceFromCamera = (playerChunk,activeChunk) => {
            const [chunkX,chunkZ] = playerChunk;
            return [Math.abs(activeChunk.x - chunkX),
                                              Math.abs(activeChunk.y - chunkZ)];
        }

        // Get the location of possible chunk loading positions
        const getPossibleChunkRenderingLocations = (playerChunkLoc) => {
            // Returns the start of possible chunk locations and the end
            return [playerChunkLoc - this.renderDistance,
                                          playerChunkLoc + this.renderDistance];
        }

        // Get the chunk the player is currently in 
        const [playerChunkX,playerChunkZ] = getPlayerChunk();
      
        // Clear the removal array
        this.coordsToRemove.length = 0;
      
        // Remove chunks outside of the render distance
        for(const [chunkCoords, chunkMesh] of this.activeChunks.entries()) {
          
          // Get the chunk distance from player camera 
          const [distanceX,distanceZ] = getChunkDistanceFromCamera(
                                       [playerChunkX,playerChunkZ],chunkCoords);

          // Check if the chunk is out of the render distance
          if(distanceX > this.renderDistance || 
                                              distanceZ > this.renderDistance) {

            // Remove the mesh from the scene
            this.scene.remove(chunkMesh);

            // Delete the chunk coords entry from the active chunks
            this.activeChunks.delete(chunkCoords);
          }
        }

        // Get the possible chunk locations to loop over
        const [xChunkStart,xChunkEnd] = getPossibleChunkRenderingLocations(
                                                                  playerChunkX);
        const [zChunkStart,zChunkEnd] = getPossibleChunkRenderingLocations(
                                                                  playerChunkZ);
      
        // Generate chunks within the render distance
        for(let x = xChunkStart; x <= xChunkEnd; x++) {
          for(let z = zChunkStart; z <= zChunkEnd; z++) {

            // Get the position where the new chunk would be located
            const newChunkCoords = new THREE.Vector2(x * this.chunkOffset,
                                                          z * this.chunkOffset);

            // Check if the chunk is already rendered
            if(!this.activeChunks.has(newChunkCoords)) {
            
              // Create a chunk in the new chunk location
              this.createChunk(newChunkCoords);
            }
          }
        }
    }

    // Generate a 16 chunk grid to start chunk generation
    generateStartingChunks() {
        for(let x = -2; x < 2; x++) {
            for(let y = -2; y < 2; y++ ) {
                this.createChunk(new THREE.Vector2(x * this.chunkOffset, 
                                                         y * this.chunkOffset));
            }
        }
    }

    // Smooth colors together based on y vertex height 
    // TODO: Work with more colors
    interpolateColor(avgYPos, color1, color2) {
        const t = (avgYPos - this.colorYThresHold) / (1 - this.colorYThresHold);

        // Lerp the colors together
        return new THREE.Color().lerpColors(color1, color2, t);
    }

    // Get colors for each vertex in the plane geometry
    generateVertexColors(geometry) {
    
        // Iterate through the vertices of the plane geometry
        const positions = geometry.attributes.position;

        // Get the number of vertices to loop 
        const numVertices = positions.count;

        // Create an array to store vertex colors
        const colorsArray = [];

        // Get the neighboring index
        const getNeighboringIndex = (yIndex, yOffset, xIndex, xOffset) => {
            return (yIndex + yOffset) * this.chunkSize + (xIndex + xOffset);
        }
    
        // Loop through the vertices in the active plane geometry
        for(let vertexIndex = 0; vertexIndex < numVertices; vertexIndex++) {
            
            // Get the Z coordinate of the current vertex
            const vertexZ = positions.getZ(vertexIndex);
    
            // Color for z vertex
            let color;

            // Check for vertex below threshold
            if(vertexZ < this.colorYThresHold) {
                // Color for regions below the threshold
                color = this.colors.belowThreshold;
            } 
            else {
                // Color for regions above the threshold
                const neighborZ = [];
                
                // Get Z coordinate of neighboring vertices
                const xIndex = vertexIndex % this.chunkSize;
                const yIndex = Math.floor(vertexIndex / this.chunkSize);
    
                // Loop through the vertex neighbors
                for(let xOffset = -1; xOffset <= 1; xOffset++) {
                    for(let yOffset = -1; yOffset <= 1; yOffset++) {
                        // Get the neighbor index based on the offsets
                        const neighborIndex = getNeighboringIndex(yIndex,
                                                        yOffset,xIndex,xOffset);
                        
                        // Check the neighboring index, check 
                        if(neighborIndex >= 0 && neighborIndex < numVertices) {
                            
                            // Get the z height of the neigbor
                            neighborZ.push(positions.getZ(neighborIndex));
                        }
                    }
                }
    
                // Get the total z value for every neighboring index
                const totalZ = neighborZ.reduce((acc, val) => acc + val, 0) 
                                                                      + vertexZ;
                
                // Get the average z value 
                const avgZ = totalZ / (neighborZ.length + 1);
                
                // Get the height based color based on neighboring values 
                color = this.interpolateColor(avgZ, this.colors.belowThreshold, 
                                                    this.colors.aboveThreshold);
            }
    
            // Add the color to the colors array
            colorsArray.push(color.r, color.g, color.b);
        }
        return colorsArray;  
    }
}