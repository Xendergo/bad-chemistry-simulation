const c = document.getElementById("c")
const draw = c.getContext("2d")

window.onresize = () => {
    c.width = window.innerWidth
    c.height = window.innerHeight
}

c.width = window.innerWidth
c.height = window.innerHeight

let shellInterval = 32

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

class Particle {
    constructor(x, y, charge) {
        this.x = x
        this.y = y
        this.vx = 0
        this.vy = 0
        this.charge = charge
    }

    simulate() {
        for (const particle of particles) {
            if (particle === this) continue

            let i_distance = 1 / dist(this.x, this.y, particle.x, particle.y)
            let force = particle.charge * this.charge * i_distance ** 2

            this.vx += force * (this.x - particle.x) * i_distance
            this.vy += force * (this.y - particle.y) * i_distance
        }
    }
}

class Nucleus extends Particle {
    constructor(x, y, charge) {
        super(x, y, charge)
    }

    shells = []

    draw() {
        draw.fillStyle = "red"
        draw.beginPath()
        draw.arc(this.x, this.y, Math.sqrt(this.charge) * 2, 0, Math.PI * 2)
        draw.fill()
    }

    simulateShells() {
        let electrons = []

        for (const particle of particles) {
            if (!(particle instanceof Electron)) continue

            let distance = dist(this.x, this.y, particle.x, particle.y)
            let closestShell = Math.max(Math.round(distance / shellInterval), 1)

            electrons.push([closestShell, particle])
        }

        let shells = []

        for (const electron of electrons) {
            if (shells[electron[0]] === undefined) shells[electron[0]] = []

            shells[electron[0]].push(electron)
        }

        for (
            let shell_number = 1;
            shell_number < shells.length + 1;
            shell_number++
        ) {
            let shell = shells[shell_number]

            if (shell === undefined) continue

            if (shell.length <= 2 * shell_number ** 2) continue

            if (shells[shell_number + 1] === undefined)
                shells[shell_number + 1] = []

            let sorted = shell.sort((a, b) => {
                return (
                    dist(this.x, this.y, b[1].x, b[1].y) -
                    dist(this.x, this.y, a[1].x, a[1].y)
                )
            })

            let amt_to_many = shell.length - 2 * (2 * shell_number - 1)

            for (let i = 0; i < amt_to_many; i++) {
                let electron_to_move_up = sorted.shift()

                shells[shell_number + 1].push(electron_to_move_up)

                electron_to_move_up[0]++
            }
        }

        for (const [shell, electron] of electrons) {
            let rel_x = this.x - electron.x
            let rel_y = this.y - electron.y

            let distance = dist(this.x, this.y, electron.x, electron.y)

            let dist_from_shell = shell * shellInterval - distance
            let inverse_square = 1 / (distance * 0.2) ** 2

            let scale = (electron.vx * rel_x + electron.vy * rel_y) / distance

            electron.vx +=
                ((-dist_from_shell * rel_x) / distance -
                    (scale * rel_x) / distance) *
                inverse_square
            electron.vy +=
                ((-dist_from_shell * rel_y) / distance -
                    (scale * rel_y) / distance) *
                inverse_square
        }
    }
}

class Electron extends Particle {
    constructor(x, y) {
        super(x, y, -1)
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

particles.push(new Nucleus(200, 200, 6))
particles.push(new Nucleus(310, 136, 1))
particles.push(new Nucleus(89, 136, 1))
particles.push(new Electron(200, 232))
particles.push(new Electron(200, 168))
particles.push(new Electron(200, 264))
particles.push(new Electron(200, 136))
particles.push(new Electron(144, 167))
particles.push(new Electron(144, 232))
particles.push(new Electron(255, 232))
particles.push(new Electron(255, 168))

function drawLoop() {
    // setTimeout(drawLoop, 1000)
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
}

drawLoop()
