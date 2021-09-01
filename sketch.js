const c = document.getElementById("c")
const draw = c.getContext("2d")

window.onresize = () => {
    c.width = window.innerWidth
    c.height = window.innerHeight
}

c.width = window.innerWidth
c.height = window.innerHeight

let shellInterval = 32;

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
        draw.arc(this.x, this.y, Math.sqrt(this.charge) * 2, 0, Math.PI*2);
        draw.fill()
    }

    simulateShells() {
        for (const particle of particles) {
            if (!(particle instanceof Electron)) continue

            let distance = dist(this.x, this.y, particle.x, particle.y)
            
            let closestShell = Math.max(Math.round(distance / shellInterval), 1)

            let dist_from_shell = closestShell * shellInterval - distance
            let inverse_square = 1 / (distance * 0.5) ** 2

            let scale = (particle.vx * this.x + particle.vy * this.y) / distance

            particle.vx += (-dist_from_shell * (this.x - particle.x) + scale * particle.vx / distance) * inverse_square
            particle.vy += (-dist_from_shell * (this.y - particle.y) + scale * particle.vy / distance) * inverse_square
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

particles.push(new Nucleus(216 + 10 * 24, 216, 1))
particles.push(new Electron(216 + 10 * 24, 248, 1))
particles.push(new Electron(216 + 10 * 24, 178, 1))
particles.push(new Electron(248 + 10 * 24, 216, 1))
particles.push(new Electron(178 + 10 * 24, 216, 1))

function drawLoop() {
    // setTimeout(drawLoop, 1000)
    requestAnimationFrame(drawLoop)

    draw.fillStyle = "black"
    draw.fillRect(0, 0, c.width, c.height);

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