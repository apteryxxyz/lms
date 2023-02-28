import { ensureFile, readFile, writeFile } from 'fs-extra';
import type { Conversation, Message } from '~/structures/uponline/Messages';

async function _readFile(path: string, def: string) {
    const cleanPath = path.replaceAll('=', '');
    return readFile(cleanPath, 'utf8').catch(() => def);
}

async function _writeFile(path: string, data: string) {
    const cleanPath = path.replaceAll('=', '');
    await ensureFile(cleanPath);
    await writeFile(cleanPath, data);
}

/** Get all the messages for a conversation. */
export async function getMessages(conversation: Conversation) {
    const path = `data/messages/${conversation.id}.json`;
    const content = await _readFile(path, '[]');
    return JSON.parse(content) as Message[];
}

/** Save the messages of a conversation. */
export async function saveMessages(
    conversation: Conversation,
    messages: Message[]
) {
    const path = `data/messages/${conversation.id}.json`;
    const content = JSON.stringify(messages, null, 4);
    await _writeFile(path, content);
}
