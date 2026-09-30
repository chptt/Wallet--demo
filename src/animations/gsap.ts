import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Single registration point — every component that needs ScrollTrigger
// imports gsap from here instead of the bare package, so the plugin is
// guaranteed registered before first use.
gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
