const c = document.getElementById("c")
const draw = c.getContext("2d")

window.onresize = () => {
    c.width = window.innerWidth
    c.height = window.innerHeight
}

c.width = window.innerWidth
c.height = window.innerHeight

let frame = 0

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
                1 / Math.max(dist(this.x, this.y, particle.x, particle.y), 1)
            let force = particle.charge * this.charge * i_distance ** 2

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
    }

    shells = []

    draw() {
        draw.fillStyle = "red"

        draw.beginPath()
        draw.arc(this.x, this.y, Math.sqrt(this.charge) * 2, 0, Math.PI * 2)
        draw.fill()

        for (let i = 1; i <= Math.ceil(Math.sqrt(this.charge / 2)); i++) {
            draw.strokeStyle = `rgba(255, 255, 255, ${0.25 / i})`

            draw.beginPath()
            draw.arc(this.x, this.y, i * shellInterval, 0, Math.PI * 2)
            draw.stroke()
        }
    }

    simulateShells() {
        let electrons = []

        // Initial shell position
        for (const particle of particles) {
            if (!(particle instanceof Electron)) continue

            if (
                particle.shell.has(this) &&
                frame - particle.shell.get(this)[0] < 30
            ) {
                electrons.push({
                    shell: particle.shell.get(this)[1],
                    electron: particle,
                })

                continue
            }

            let distance = dist(this.x, this.y, particle.x, particle.y)
            let closestShell = Math.max(Math.round(distance / shellInterval), 1)

            electrons.push({ shell: closestShell, electron: particle })
        }

        let shells = []

        for (const electron of electrons) {
            if (shells[electron.shell] === undefined)
                shells[electron.shell] = []

            shells[electron.shell].push(electron)
        }

        // Kick out electrons when a shell is too crowded
        for (
            let shell_number = 1;
            shell_number < shells.length + 1;
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

        for (let i = electrons.length - 1; i >= 0; i--) {
            if (electrons[i].shell > Math.ceil(Math.sqrt(this.charge / 2))) {
                electrons[i].electron.shell.delete(this)
                electrons.splice(i, 1)
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

            if (force_added > 0.01) {
                electron_with_data.shell++
            }

            if (force_added < -0.01 && electron_with_data.shell > 1) {
                electron_with_data.shell--
            }

            electron.vx += x_force
            electron.vy += y_force

            this.vx -= x_force
            this.vy -= y_force
        }

        for (const { shell, electron } of electrons) {
            electron.shell.set(this, [frame, shell])
        }
    }
}

class Electron extends Particle {
    constructor(x, y, vx, vy) {
        super(x, y, vx, vy, -1)
    }

    shell = new Map()

    draw() {
        draw.fillStyle = "yellow"
        draw.beginPath()
        draw.arc(this.x, this.y, 2, 0, Math.PI * 2)
        draw.fill()
    }
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
            let angle = (j / shell_amt) * (Math.PI * 2) + angle_offset

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

// particles.push(new Nucleus(200, 200, 6))
// particles.push(new Nucleus(310, 136, 1))
// particles.push(new Nucleus(89, 136, 1))
// particles.push(new Electron(200, 232))
// particles.push(new Electron(200, 168))
// particles.push(new Electron(200, 264))
// particles.push(new Electron(200, 136))
// particles.push(new Electron(144, 167))
// particles.push(new Electron(144, 232))
// particles.push(new Electron(255, 232))
// particles.push(new Electron(255, 168))

for (let i = 0; i < 1; i++) {
    let randX = Math.random() * 600
    let randY = Math.random() * 600

    addAtom(randX, randY, 6, 0, 0.5) // Oxygen
    addAtom(randX + 40, randY - 40, 1, (Math.PI * 2) / 3, 0.5) // Hydrogen
    addAtom(randX - 40, randY - 40, 1, (Math.PI * 1) / 3, 0.5) // Hydrogen

    // addAtom(randX + 400, randY, 11, 0, -0.5, 0) // Sodium
}

// addAtom(500, 200, 1, 0, 1)
// particles.push(new Electron(484, 200, 0, 0))

function drawLoop() {
    // setTimeout(drawLoop, 100)
    requestAnimationFrame(drawLoop)

    draw.fillStyle = "black"
    draw.fillRect(0, 0, c.width, c.height)

    for (const particle of particles) {
        particle.draw()
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

    frame++
}

drawLoop()
