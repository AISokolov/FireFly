export async function finishBeforeClose({ ready, flushWebviews, flushSession, destroy, timeoutMs = 750 }) {
    if (ready) {
        const finalSave = Promise.allSettled([flushWebviews(), flushSession()]);
        await Promise.race([finalSave, new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
    }
    await destroy();
}
