const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer()
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000)

camera.position.z = 200

const ELECTRON_MATERIAL = new THREE.MeshBasicMaterial({color: 0xffff00})
const ELECTRON_GEOMETRY = new THREE.SphereGeometry(1)

const NUCLEUS_MATERIAL = new THREE.MeshBasicMaterial({color: 0xff0000})

document.body.appendChild(renderer.domElement)

window.onresize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth/window.innerHeight
}

window.onresize()

// Constants
const shellInterval = 16

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

function project(fromX, fromY, toX, toY) {
    let distance = dist(0, 0, toX, toY)
    let scale = (fromX * toX + fromY * toY) / distance

    let x = (toX * scale) / distance
    let y = (toY * scale) / distance

    return {
        x: x,
        y: y,
        distance: Math.sqrt(x ** 2 + y ** 2),
    }
}

class Particle {
    constructor(x, y, vx, vy, charge) {
        this.x = x
        this.y = y
        this.vx = vx
        this.vy = vy
        this.charge = charge
    }

    x
    y
    vx
    vy
    charge
    force_added_x
    force_added_y

    simulate() {
        this.force_added_x = 0
        this.force_added_y = 0

        for (const particle of particles) {
            if (particle === this) continue

            let i_distance =
                1 /
                Math.max(dist(this.x, this.y, particle.x, particle.y) / 2, 1)
            let force =
                particle.charge * Math.sign(this.charge) * i_distance ** 2

            if (this.pair === particle) {
                force -= 0.05
            }

            this.force_added_x +=
                force * (this.x - particle.x) * i_distance * 2 +
                (Math.random() - 0.5) * 0.02
            this.force_added_y +=
                force * (this.y - particle.y) * i_distance * 2 +
                (Math.random() - 0.5) * 0.02
        }

        this.vx += this.force_added_x
        this.vy += this.force_added_y
    }
}

class Nucleus extends Particle {
    constructor(x, y, vx, vy, charge) {
        super(x, y, vx, vy, charge)

        const geometry = new THREE.SphereGeometry(Math.sqrt(this.charge) * 2)

        this.mesh = new THREE.Mesh(geometry, NUCLEUS_MATERIAL)

        scene.add(this.mesh)
    }

    shells = []
    mesh

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

            let distance = dist(this.x, this.y, particle.x, particle.y)
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
                    dist(this.x, this.y, b.electron.x, b.electron.y) -
                    dist(this.x, this.y, a.electron.x, a.electron.y)
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

            // debugger

            if (pairs_needed > 0) {
                pairless_in_shell.sort(
                    (a, b) =>
                        Math.atan2(
                            this.y - a.electron.y,
                            this.x - a.electron.y
                        ) -
                        Math.atan2(this.y - b.electron.y, this.x - b.electron.x)
                )

                let total_dist_1 = 0
                let total_dist_2 = 0

                for (let i = 0; i < pairs_needed; i++) {
                    let e1 = pairless_in_shell[i * 2].electron
                    let e2 = pairless_in_shell[i * 2 + 1].electron
                    total_dist_1 += dist(e1.x, e1.y, e2.x, e2.y)
                }

                pairless_in_shell.push(pairless_in_shell.shift())

                for (let i = 0; i < pairs_needed; i++) {
                    let e1 = pairless_in_shell[i * 2].electron
                    let e2 = pairless_in_shell[i * 2 + 1].electron
                    total_dist_2 += dist(e1.x, e1.y, e2.x, e2.y)
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

            let rel_x = this.x - electron.x
            let rel_y = this.y - electron.y

            let distance = dist(this.x, this.y, electron.x, electron.y)

            let dist_from_shell = shell * shellInterval - distance
            let inverse_square = Math.min(1 / (distance * 0.1) ** 2, 1)

            let projected = project(electron.vx, electron.vy, rel_x, rel_y)

            let x_force =
                ((-dist_from_shell * rel_x) / distance - projected.x) *
                inverse_square

            let y_force =
                ((-dist_from_shell * rel_y) / distance - projected.y) *
                inverse_square

            let force_added = project(
                electron.force_added_x,
                electron.force_added_y,
                rel_x,
                rel_y
            ).distance

            // if (force_added > 0.5) {
            //     electron_with_data.shell++
            // }

            // if (force_added < -0.1 && electron_with_data.shell > 1) {
            //     electron_with_data.shell--
            // }

            electron.vx += x_force
            electron.vy += y_force

            this.vx -= x_force / this.charge
            this.vy -= y_force / this.charge
        }

        for (const { shell, electron } of electrons) {
            electron.shell.set(this, shell)
        }
    }
}

class Electron extends Particle {
    constructor(x, y, vx, vy) {
        super(x, y, vx, vy, -1)

        this.mesh = new THREE.Mesh(ELECTRON_GEOMETRY, ELECTRON_MATERIAL)

        scene.add(this.mesh)
    }

    shell = new Map()
    pair = null
    mesh
}

let particles = []

function addAtom(x, y, protons, angle_offset = 0, vx = 0, vy = 0) {
    particles.push(new Nucleus(x, y, vx, vy, protons))

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
                    x + Math.cos(angle) * i * shellInterval,
                    y + Math.sin(angle) * i * shellInterval,
                    vx,
                    vy
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
        particle.x += particle.vx * 1
        particle.y += particle.vy * 1
    }

    for (const particle of particles) {
        particle.mesh.position.x = particle.x
        particle.mesh.position.y = particle.y
    }

    renderer.render(scene, camera)
}

requestAnimationFrame(drawLoop)
