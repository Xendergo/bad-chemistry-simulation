const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer()
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000)

camera.position.z = 200
camera.position.x = 100

const ELECTRON_MATERIAL = new THREE.MeshPhysicalMaterial({color: 0xffff00, clearcoat: 1, clearcoatRoughness: 0.75, emissive: 0x808000})
const ELECTRON_GEOMETRY = new THREE.SphereGeometry(1)

const NUCLEUS_MATERIAL = new THREE.MeshPhysicalMaterial({color: 0xff0000, clearcoat: 1, clearcoatRoughness: 0.75, emissive: 0x800000})

scene.add(new THREE.AmbientLight(0x404040))

document.body.appendChild(renderer.domElement)

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth/window.innerHeight
}

window.onresize()

// Constants
const shellInterval = 16

class Vector {
    /**
     * Construct a new vector with these X, Y, & Z components
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    constructor(x, y, z) {
        this.x = x
        this.y = y
        this.z = z
    }

    /**
     * A vector with zero length
     */
    static get Zero() {
        return new Vector(0, 0, 0)
    }

    /**
     * X component
     * @type {number}
     */
    x

    /**
     * Y component
     * @type {number}
     */
    y

    /**
     * Z component
     * @type {number}
     */
    z

    get magnitude() {
        return this.dist(Vector.Zero)
    }
    
    /**
     * Get the distance from this vector to another vector
     * @param {Vector} other 
     * @returns {number}
     */
    dist(other) {
        return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2 + (this.z - other.z) ** 2)
    }

    /**
     * Get the dot product between this vector and the other vector
     * @param {Vector} other 
     * @returns {number}
     */
    dot(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z
    }
    
    /**
     * Get the angle between this vector and the other vector
     * @param {Vector} other 
     * @returns {number}
     */
    angle_between(other) {
        return Math.acos(this.dot(other) / this.magnitude * other.magnitude)
    }
    
    /**
     * A normalized version of the vector
     */
    get normalize() {
        return this.scale(1 / this.magnitude)
    }

    /**
     * Normalize the vector
     */
    normalize_eq() {
        let len = 1 / this.magnitude

        this.x *= len
        this.y *= len
        this.z *= len
    }

    /**
     * Return a new vector which is the sum of this vector and the other
     * @param {Vector} other 
     * @returns {Vector}
     */
    add(other) {
        return new Vector(this.x + other.x, this.y + other.y, this.z + other.z)
    }

    /**
     * Add another vector to this vector
     * @param {Vector} other 
     */
    add_eq(other) {
        this.x  += other.x
        this.y += other.y
        this.z += other.z
    }

    /**
     * Returns a new vector with is this vector minus the other vector
     * @param {Vector} other 
     * @returns {Vector}
     */
    sub(other) {
        return new Vector(this.x - other.x, this.y - other.y, this.z - other.z)
    }

    /**
     * Subtract the other vector from this vector
     * @param {Vector} other 
     */
    sub_eq(other) {
        this.x -= other.x
        this.y -= other.y
        this.z -= other.z
    }

    /**
     * Return a new vector which is this vector scaled by the factor
     * @param {number} factor 
     * @returns 
     */
    scale(factor) {
        return new Vector(this.x * factor, this.y * factor, this.z * factor)
    }

    /**
     * Scale this vector by the factor
     * @param {number} factor 
     */
    scale_eq(factor) {
        this.x *= factor
        this.y *= factor
        this.z *= factor
    }

    /**
     * Return a new vector which is this vector projected onto the other vector
     * @param {Vector} other 
     * @returns {Vector}
     */
    project(other) {
        let distance = other.magnitude
        let scale = (this.x * other.x + this.y * other.y + this.z * other.z) / distance

        let x = (other.x * scale) / distance
        let y = (other.y * scale) / distance
        let z = (other.z * scale) / distance

        return new Vector(x, y, z)
    }

    /**
     * Align this vector to the other vector
     * @param {Vector} other 
     */
    project_eq(other) {
        let distance = other.magnitude
        let scale = (this.x * other.x + this.y * other.y + this.z * other.z) / distance

        this.x = (other.x * scale) / distance
        this.y = (other.y * scale) / distance
        this.z = (other.z * scale) / distance
    }

    /**
     * Return a new vector which is this vector rotated to the other vector
     * @param {Vector} other 
     * @returns {Vector}
     */
    align(other) {
        return other.normalize().scale(this.magnitude)
    }

    align_eq(other) {
        let aligned = this.align(other)

        this.x = aligned.x
        this.y = aligned.y
        this.z = aligned.z
    }
}

class Particle {
    constructor(pos, velocity, charge) {
        this.pos = pos
        this.velocity = velocity
        this.charge = charge

        this.light = new THREE.PointLight(0x101010 * Math.abs(charge))
        scene.add(this.light)
    }

    pos
    velocity
    charge
    force_added
    light

    simulate() {
        this.force_added = Vector.Zero

        for (const particle of particles) {
            if (particle === this) continue

            let i_distance =
                1 /
                Math.max(this.pos.dist(particle.pos) / 2, 1)

            let force =
                particle.charge * Math.sign(this.charge) * i_distance ** 2

            if (this.pair === particle) {
                force -= 0.05
            }

            this.force_added.add_eq(this.pos.sub(particle.pos).scale(force * i_distance * 2))
            this.force_added.add_eq(new Vector((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02))
        }

        this.velocity.add_eq(this.force_added)
    }
}

class Nucleus extends Particle {
    constructor(pos, velocity, charge) {
        super(pos, velocity, charge)

        const geometry = new THREE.SphereGeometry(Math.sqrt(this.charge) * 2)

        this.mesh = new THREE.Mesh(geometry, NUCLEUS_MATERIAL)
        scene.add(this.mesh)
    }

    shells = []
    mesh
    light

    // draw() {
    //     for (let i = 1; i <= Math.ceil(Math.sqrt(this.charge / 2)); i++) {
    //         draw.strokeStyle = `rgba(255, 255, 255, ${0.25 / i})`

    //         draw.beginPath()
    //         draw.arc(this.x, this.y, i * shellInterval, 0, Math.PI * 2)
    //         draw.stroke()
    //     }
    // }

    simulateShells() {
        let electrons = []

        const max_shell = Math.ceil(Math.sqrt(this.charge / 2))

        // Initial shell position
        for (const particle of particles) {
            if (!(particle instanceof Electron)) continue

            if (particle.shell.has(this)) {
                electrons.push({
                    shell: particle.shell.get(this),
                    electron: particle,
                })

                continue
            }

            let distance = this.pos.dist(particle.pos)
            let closestShell = Math.max(Math.round(distance / shellInterval), 1)

            electrons.push({ shell: closestShell, electron: particle })
        }

        let shells = []

        // Group electrons by shell
        for (const electron of electrons) {
            if (shells[electron.shell] === undefined)
                shells[electron.shell] = []

            shells[electron.shell].push(electron)
        }

        // Kick out electrons when a shell is too crowded
        for (
            let shell_number = 1;
            shell_number < shells.length;
            shell_number++
        ) {
            let shell = shells[shell_number]

            if (shell === undefined) continue

            if (shell.length <= 4 * (shell_number - 1) + 2) continue

            if (shells[shell_number + 1] === undefined)
                shells[shell_number + 1] = []

            // Prioritize the electrons in the shell that are far away
            let sorted = shell.sort((a, b) => {
                return (
                    this.pos.dist(b.electron.pos) -
                    this.pos.dist(a.electron.pos)
                )
            })

            let amt_to_many = shell.length - 4 * shell_number + 2

            for (let i = 0; i < amt_to_many; i++) {
                let electron_to_move_up = sorted.shift()

                shells[shell_number + 1].push(electron_to_move_up)

                electron_to_move_up.shell++
            }
        }

        // Make sure electron pairs have certain properties
        for (const { shell, electron } of electrons) {
            if (electron.pair === null || shell > max_shell) continue

            // They must actually be pairs instead of a weird chain or pairs with nothing
            if (electron.pair.pair !== electron) {
                electron.pair = null
                continue
            }

            // They must be in an electron shell and in the same shell
            if (
                electron.shell.size === 0 ||
                electron.pair.shell.get(this) !== shell
            )
                electron.pair = null
        }

        for (let i = electrons.length - 1; i >= 0; i--) {
            if (electrons[i].shell > max_shell) {
                electrons[i].electron.shell.delete(this)
                electrons.splice(i, 1)
            }
        }

        for (
            let shell_number = 1;
            shell_number <= Math.ceil(Math.sqrt(this.charge / 2));
            shell_number++
        ) {
            let shell = shells[shell_number]

            if (shell === undefined) continue

            let pairless_in_shell = shell.filter(e => !e.electron.pair)

            let pairs_needed =
                pairless_in_shell.length - (2 * (shell_number - 1) + 1)

            if (pairs_needed > 0) {
                pairless_in_shell.sort(
                    (a, b) =>
                        this.pos.angle_between(a.electron.pos) -
                        this.pos.angle_between(b.electron.pos)
                )

                let total_dist_1 = 0
                let total_dist_2 = 0

                for (let i = 0; i < pairs_needed; i++) {
                    let e1 = pairless_in_shell[i * 2].electron
                    let e2 = pairless_in_shell[i * 2 + 1].electron
                    total_dist_1 += e1.pos.dist(e2.pos)
                }

                pairless_in_shell.push(pairless_in_shell.shift())

                for (let i = 0; i < pairs_needed; i++) {
                    let e1 = pairless_in_shell[i * 2].electron
                    let e2 = pairless_in_shell[i * 2 + 1].electron
                    total_dist_2 += e1.pos.dist(e2.pos)
                }

                if (total_dist_1 < total_dist_2) {
                    pairless_in_shell.unshift(pairless_in_shell.pop())
                }

                for (let i = 0; i < pairs_needed; i++) {
                    let e1 = pairless_in_shell[i * 2].electron
                    let e2 = pairless_in_shell[i * 2 + 1].electron

                    e1.pair = e2
                    e2.pair = e1
                }
            }
        }

        for (const electron_with_data of electrons) {
            let { shell, electron } = electron_with_data

            let rel = this.pos.sub(electron.pos)

            let distance = this.pos.dist(electron.pos)

            let dist_from_shell = shell * shellInterval - distance
            let inverse_square = Math.min(1 / (distance * 0.1) ** 2, 1)

            let projected = electron.velocity.project(rel)

            let force = rel.scale(-dist_from_shell * (1/distance)).sub(projected).scale(inverse_square)

            let force_added = electron.force_added.project(
                rel
            ).dist(Vector.Zero)

            // if (force_added > 0.5) {
            //     electron_with_data.shell++
            // }

            // if (force_added < -0.1 && electron_with_data.shell > 1) {
            //     electron_with_data.shell--
            // }

            electron.velocity.add_eq(force)
            this.velocity.sub_eq(force.scale(1 / this.charge))
        }

        for (const { shell, electron } of electrons) {
            electron.shell.set(this, shell)
        }
    }
}

class Electron extends Particle {
    constructor(pos, velocity) {
        super(pos, velocity, -1)

        this.mesh = new THREE.Mesh(ELECTRON_GEOMETRY, ELECTRON_MATERIAL)

        scene.add(this.mesh)
    }

    shell = new Map()
    pair = null
    mesh
}

let particles = []

function addAtom(x, y, protons, angle_offset = 0, vx = 0, vy = 0) {
    particles.push(new Nucleus(new Vector(x, y, 0), new Vector(vx, vy, 0), protons))

    let shells = [0, 0, 0, 0, 0, 0, 0, 0]

    for (let i = 1; i <= protons; i++) {
        shells[Math.ceil(Math.sqrt(i / 2))]++
    }

    for (let i = 0; i < shells.length; i++) {
        let shell_amt = shells[i]

        for (let j = 0; j < shell_amt; j++) {
            let angle =
                ((j % 2 === 0 ? j / 2 : j / 2 - 0.4) / shell_amt) *
                    2 *
                    (Math.PI * 2) +
                angle_offset

            particles.push(
                new Electron(
                    new Vector(x + Math.cos(angle) * i * shellInterval,
                    y + Math.sin(angle) * i * shellInterval, 0),
                    new Vector(vx,
                    vy, 0)
                )
            )
        }
    }
}

// for (let i = 0; i < 10; i++) {
//     let randX = Math.random() * 600
//     let randY = Math.random() * 600

//     addAtom(randX, randY, 8, 0, 0.5) // Oxygen
//     addAtom(randX + 35, randY - 35, 1, (Math.PI * 2) / 3, 0.5) // Hydrogen
//     addAtom(randX - 35, randY - 35, 1, (Math.PI * 1) / 3, 0.5) // Hydrogen

//     addAtom(randX + 400, randY, 11, 0, -0.5, 0) // Sodium
// }

addAtom(0, 0, 1)
addAtom(48, 0, 8)
addAtom(112, 0, 6)
addAtom(112, 48, 1, -Math.PI / 2)
addAtom(112, -48, 1, Math.PI / 2)
addAtom(176, 0, 6)
addAtom(176, -48, 1, Math.PI / 2)
addAtom(176, 64, 7, -Math.PI / 2)
addAtom(176, 112, 1, -Math.PI / 2)
addAtom(135, 90, 1, -Math.PI / 3)
addAtom(217, 90, 1, (-Math.PI * 2) / 3)
addAtom(240, 0, 6)
addAtom(240, -64, 8, Math.PI / 2)
addAtom(304, 0, 8, Math.PI / 6)

function drawLoop() {
    // setTimeout(drawLoop, 100)
    requestAnimationFrame(drawLoop)

    for (const particle of particles) {
        particle.simulate()
    }

    for (const particle of particles) {
        if (particle instanceof Nucleus) {
            particle.simulateShells()
        }
    }

    for (const particle of particles) {
        particle.pos.add_eq(particle.velocity.scale(1))
    }

    for (const particle of particles) {
        particle.mesh.position.x = particle.pos.x
        particle.mesh.position.y = particle.pos.y
        particle.mesh.position.z = particle.pos.z

        if (particle.light) {
            particle.light.position.x = particle.pos.x
            particle.light.position.y = particle.pos.y
            particle.light.position.z = particle.pos.z
        }
    }

    renderer.render(scene, camera)
}

requestAnimationFrame(drawLoop)
