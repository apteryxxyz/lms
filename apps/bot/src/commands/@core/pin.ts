import { Command } from 'maclary';

export class PinCommand extends Command<
    Command.Type.ContextMenu,
    [Command.Kind.Message]
> {
    public constructor() {
        super({
            name: 'Toggle Pin',
            description: 'Pin or unpin a message.',
            type: Command.Type.ContextMenu,
            kinds: [Command.Kind.Message],
        });
    }

    public override async onMessageMenu(menu: Command.MessageContextMenu) {
        const isPinned = menu.targetMessage.pinned;

        if (isPinned) await menu.targetMessage.unpin();
        else await menu.targetMessage.pin();

        await menu.reply({
            content: `Message ${
                isPinned ? 'unpinned' : 'pinned'
            } successfully!`,
        });
    }
}
