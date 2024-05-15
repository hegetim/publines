import { open } from 'node:fs/promises';


export const saveToFile = async (path: string, data: any) => {
    const handle = await open(path, 'w');
    await handle.write(JSON.stringify(data));
}
