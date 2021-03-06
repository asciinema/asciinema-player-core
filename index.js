import {create} from "./vt-js/pkg/vt_js";


class AsciinemaPlayerCore {
    constructor(url, opts) {
        this.url = url;
        this.loop = opts && !!opts.loop;

        this.lines = [];
        this.changedLines = new Set();

        this.runFrame = this.runFrame.bind(this);
    }

    load() {
        return fetch(this.url)
            .then(res => res.json())
            .then(asciicast => {
                this.width = asciicast['width'];
                this.height = asciicast['height'];
                this.frames = asciicast['stdout'];

                for (let i = 0; i < this.height; i++) {
                    this.changedLines.add(i);
                }

                return {
                    width: this.width,
                    height: this.height
                };
        })
    }

    start() {
        console.log('starting');
        this.vt = create(this.width, this.height);
        this.nextFrameIndex = 0;
        this.virtualElapsedTime = 0;
        this.startedTime = (new Date()).getTime();
        this.lastFrameTime = this.startedTime;
        this.scheduleNextFrame();
    }

    scheduleNextFrame() {
        const nextFrame = this.frames[this.nextFrameIndex];

        if (nextFrame) {
            const delay = nextFrame[0] * 1000;
            const actualElapsedTime = (new Date()).getTime() - this.startedTime;
            let timeout = (this.virtualElapsedTime + delay) - actualElapsedTime;

            if (timeout < 0) {
                timeout = 0;
            }

            setTimeout(this.runFrame, timeout);
            // console.log(`${delay} => ${timeout}`);
        } else {
            console.log('done');

            if (this.loop) {
                this.start();
            }
        }
    }

    runFrame() {
        let frame = this.frames[this.nextFrameIndex];
        let actualElapsedTime;

        do {
            const affectedLines = this.vt.feed(frame[1]);
            affectedLines.forEach(i => this.changedLines.add(i));

            this.virtualElapsedTime += (frame[0] * 1000);
            this.nextFrameIndex++;
            frame = this.frames[this.nextFrameIndex];
            actualElapsedTime = (new Date()).getTime() - this.startedTime;
        } while (frame && (actualElapsedTime > (this.virtualElapsedTime + frame[0] * 1000)));

        this.scheduleNextFrame();
    }

    stop() {
        // clearInterval(this.interval);
        // clearTimeout(...);
    }

    getChangedLines() {
        const lines = new Map();

        if (this.vt) {
            for (const i of this.changedLines) {
                lines.set(i, {id: i, segments: this.vt.get_line(i)});
            }

            this.changedLines.clear();
        }

        return lines;
    }
}

export default AsciinemaPlayerCore;
