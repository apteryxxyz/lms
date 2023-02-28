import { Context } from '@maclary/context';
import { Command } from 'maclary';

export default class PingCommand extends Command<
    Command.Type.ChatInput,
    [Command.Kind.Slash, Command.Kind.Prefix]
> {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Slash, Command.Kind.Prefix],
            name: 'ping',
            description:
                "Pong! Shows the latency and ping of the bot's connection to Discord.",
        });
    }

    public override onPrefix(message: Command.Message) {
        return this._sharedRun(new Context(message));
    }

    public override onSlash(input: Command.ChatInput) {
        return this._sharedRun(new Context(input));
    }

    private async _sharedRun(context: Context) {
        const reply = (await context.reply({
            content: 'Pinging client...',
            fetchReply: true,
        })) as Command.Message;

        const botLatency = reply.createdTimestamp - context.createdTimestamp;
        await context.editReply(
            `🏓 **Ping**: ${context.client.ws.ping}ms, ` +
                `**Latency**: ${botLatency}ms`
        );
    }
}
