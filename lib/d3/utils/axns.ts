import { wait } from "./index"
const loadAudio = (src: string): Promise<HTMLAudioElement> => {
    const audio = new Audio(src)
    return new Promise((resolve, reject) => {
        audio.addEventListener("loadeddata", () => {
            resolve(audio)
        }) 
        audio.addEventListener("error", reject)
    })
}
export const playAudio = async (src: string, vol=1, delay=0, loop=true) => {
    console.log("Load Audio Call")
    const audio = await loadAudio(src)
    audio.volume = vol
    audio.loop = loop
    wait(delay).then(() => audio.play())
}

