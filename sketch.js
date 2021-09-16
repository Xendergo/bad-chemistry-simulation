import * as THREE from "https://cdn.skypack.dev/three@0.132.2"

const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer()
const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
)

camera.position.z = 200
camera.position.x = 100

const keys = {}

window.onkeydown = e => {
    keys[e.key.toLowerCase()] = true
}

window.onkeyup = e => {
    keys[e.key.toLowerCase()] = false
}

const ELECTRON_MATERIAL = new THREE.MeshPhysicalMaterial({
    color: 0xffff00,
    clearcoat: 1,
    clearcoatRoughness: 0.75,
    emissive: 0x808000,
})
const ELECTRON_GEOMETRY = new THREE.SphereGeometry(1)

const NUCLEUS_MATERIAL = new THREE.MeshPhysicalMaterial({
    color: 0xff0000,
    clearcoat: 1,
    clearcoatRoughness: 0.75,
    emissive: 0x800000,
})

scene.add(new THREE.AmbientLight(0x404040))

const quat_up = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.01, 0, 0))
const quat_down = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-0.01, 0, 0)
)
const quat_left = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, 0.01, 0)
)
const quat_right = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(0, -0.01, 0)
)

document.body.appendChild(renderer.domElement)

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
}

window.onresize()

// Constants
const shellInterval = 0.5
const angstrom = 32

const electric_force = 0.002
const pair_force = 0.05
const shell_force = 0.1
const randomness = 0.0003125

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
        this.force_added = new THREE.Vector3(0, 0, 0)

        for (const particle of particles) {
            if (particle === this) continue

            let i_distance =
                1 / Math.max(this.pos.distanceTo(particle.pos) / 2, 1)

            let force =
                particle.charge * Math.sign(this.charge) * i_distance ** 2

            if (this.pair === particle) {
                force -= pair_force
            }

            this.force_added.add(
                this.pos
                    .clone()
                    .sub(particle.pos)
                    .multiplyScalar(force * i_distance * electric_force)
            )
            this.force_added.add(
                new THREE.Vector3(0, 0, 0).random().sub(new THREE.Vector3(0.5, 0.5, 0.5)).multiplyScalar(2 * randomness)
            )
        }

        this.velocity.add(this.force_added)
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

            let distance = this.pos.distanceTo(particle.pos)
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
                    this.pos.distanceTo(b.electron.pos) -
                    this.pos.distanceTo(a.electron.pos)
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
                        this.pos.angleTo(a.electron.pos) -
                        this.pos.angleTo(b.electron.pos)
                )

                let total_dist_1 = 0
                let total_dist_2 = 0

                for (let i = 0; i < pairs_needed; i++) {
                    let e1 = pairless_in_shell[i * 2].electron
                    let e2 = pairless_in_shell[i * 2 + 1].electron
                    total_dist_1 += e1.pos.distanceTo(e2.pos)
                }

                pairless_in_shell.push(pairless_in_shell.shift())

                for (let i = 0; i < pairs_needed; i++) {
                    let e1 = pairless_in_shell[i * 2].electron
                    let e2 = pairless_in_shell[i * 2 + 1].electron
                    total_dist_2 += e1.pos.distanceTo(e2.pos)
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

            let rel = this.pos.clone().sub(electron.pos)

            let distance = this.pos.distanceTo(electron.pos)

            let dist_from_shell = shell * shellInterval - distance
            let inverse_square = Math.min(shell_force / (distance) ** 2, 1)

            let projected = electron.velocity.clone().projectOnVector(rel)

            let force = rel
                .clone()
                .multiplyScalar(-dist_from_shell * (1 / distance))
                .sub(projected)
                .multiplyScalar(inverse_square)

            let force_added = electron.force_added.projectOnVector(rel).length()

            // if (force_added > 0.5) {
            //     electron_with_data.shell++
            // }

            // if (force_added < -0.1 && electron_with_data.shell > 1) {
            //     electron_with_data.shell--
            // }

            electron.velocity.add(force)
            this.velocity.sub(force.clone().multiplyScalar(1 / this.charge))
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
    particles.push(
        new Nucleus(
            new THREE.Vector3(x, y, 0),
            new THREE.Vector3(vx, vy, 0),
            protons
        )
    )

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
                    new THREE.Vector3(
                        x + Math.cos(angle) * i * shellInterval,
                        y + Math.sin(angle) * i * shellInterval,
                        0
                    ),
                    new THREE.Vector3(vx, vy, 0)
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
addAtom(1.5, 0, 8)
addAtom(3.5, 0, 6)
addAtom(3.5, 1.5, 1, -Math.PI / 2)
addAtom(3.5, -1.5, 1, Math.PI / 2)
addAtom(5.5, 0, 6)
addAtom(5.5, -1.5, 1, Math.PI / 2)
addAtom(5.5, 2, 7, -Math.PI / 2)
addAtom(5.5, 3.5, 1, -Math.PI / 2)
addAtom(4.21875, 2.8125, 1, -Math.PI / 3)
addAtom(6.78125, 2.8125, 1, (-Math.PI * 2) / 3)
addAtom(7.5, 0, 6)
addAtom(7.5, -2, 8, Math.PI / 2)
addAtom(9.5, 0, 8, Math.PI / 6)

function drawLoop() {
    // setTimeout(drawLoop, 100)
    requestAnimationFrame(drawLoop)

    if (keys.w) {
        camera.position.add(
            new THREE.Vector3(0, 0, -2).applyQuaternion(camera.quaternion)
        )
    }

    if (keys.s) {
        camera.position.add(
            new THREE.Vector3(0, 0, 2).applyQuaternion(camera.quaternion)
        )
    }

    if (keys.a) {
        camera.position.add(
            new THREE.Vector3(-2, 0, 0).applyQuaternion(camera.quaternion)
        )
    }

    if (keys.d) {
        camera.position.add(
            new THREE.Vector3(2, 0, 0).applyQuaternion(camera.quaternion)
        )
    }

    if (keys.arrowup) {
        camera.quaternion.multiply(quat_up)
    }

    if (keys.arrowdown) {
        camera.quaternion.multiply(quat_down)
    }

    if (keys.arrowleft) {
        camera.quaternion.multiply(quat_left)
    }

    if (keys.arrowright) {
        camera.quaternion.multiply(quat_right)
    }

    for (const particle of particles) {
        particle.simulate()
    }

    for (const particle of particles) {
        if (particle instanceof Nucleus) {
            particle.simulateShells()
        }
    }

    for (const particle of particles) {
        particle.pos.add(particle.velocity.clone().multiplyScalar(1))
    }

    for (const particle of particles) {
        particle.mesh.position
            .set(particle.pos.x, particle.pos.y, particle.pos.z)
            .multiplyScalar(angstrom)

        if (particle.light) {
            particle.light.position
                .set(particle.pos.x, particle.pos.y, particle.pos.z)
                .multiplyScalar(angstrom)
        }
    }

    renderer.render(scene, camera)
}

requestAnimationFrame(drawLoop)
