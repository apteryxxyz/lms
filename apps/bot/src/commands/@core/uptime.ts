import { Context } from '@maclary/context';
import ms from 'enhanced-ms';
import { Command } from 'maclary';

export default class UptimeCommand extends Command<
    Command.Type.ChatInput,
    [Command.Kind.Slash, Command.Kind.Prefix]
> {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash, Command.Kind.Prefix],
            name: 'uptime',
            description: 'Shows how long the bot has been online for.',
        });
    }

    public override onPrefix(message: Command.Message) {
        return this._sharedRun(new Context(message));
    }

    public override onSlash(input: Command.ChatInput) {
        return this._sharedRun(new Context(input));
    }

    private async _sharedRun(context: Context) {
        const uptime = context.client.uptime;
        const formattedUptime = ms(uptime, { shortFormat: true });
        await context.reply(`🤖 **Uptime**: ${formattedUptime}`);
    }
}
