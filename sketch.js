const c = document.getElementById("c")
const draw = c.getContext("2d")

window.onresize = () => {
    c.width = window.innerWidth
    c.height = window.innerHeight
}

c.width = window.innerWidth
c.height = window.innerHeight

let shellInterval = 16;

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
            if (particle === this) continue;

            let i_distance = 1 / ((this.x - particle.x) + (this.y - particle.y))
            let force = particle.charge * this.charge * i_distance

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
        draw.arc(this.x, this.y, Math.sqrt(this.charge) * 2, 0, Math.PI*2);
        draw.fill()
    }

    simulateShells() {
        for (const particle of particles) {
            if (!(particle instanceof Electron)) continue

            let distance = dist(this.x, this.y, particle.x, particle.y)
            
            let closestShell = Math.round(distance / closestShell)
            let shellOffset = 0

            while (true) {
                let shell = closestShell + shellOffset

                if (shell > 0) {
                    let amt_in_shell = this.shells[shell]

                    if (amt_in_shell === undefined) {
                        this.shells[shell] = 0
                        amt_in_shell = 0
                    }

                    if (amt_in_shell < 2 * shell ** 2) {
                        closestShell = closestShell + shellOffset
                        particle.shell.set(this, closestShell)
                        break
                    }
                }

                shellOffset = Math.abs(shellOffset) * -Math.sign(shellOffset)
            }

            let dist_from_shell = closestShell * shellInterval - distance

            let force = dist_from_shell * (1 / distance ** 2)

            particle.vx += force * (this.x - particle.x)
            particle.vy += force * (this.y - particle.y)
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
        draw.arc(this.x, this.y, 2, 0, Math.PI*2)
        draw.fill()
    }
}

let particles = []

particles.push(new Nucleus(16 + 10 * 24, 16, 2))
particles.push(new Electron(18 + 10 * 24, 24, 1))
particles.push(new Electron(14 + 10 * 24, 10, 1))

function drawLoop() {
    // setTimeout(drawLoop, 1000)
    requestAnimationFrame(drawLoop)

    draw.fillStyle = "black"
    draw.fillRect(0, 0, c.width, c.height);

    for (const particle of particles) {
        particle.draw()
        particle.simulate()

        if (particle instanceof Nucleus) {
            particle.simulateShells()
        }
    }

    for (const particle of particles) {
        particle.x += particle.vx * 0.1
        particle.y += particle.vy * 0.1
    }
}

drawLoop()