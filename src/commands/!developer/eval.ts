import { codeBlock, EmbedBuilder } from '@discordjs/builders';
import { Command, container, Preconditions } from 'maclary';
import { inspect } from 'util';

export default class Eval extends Command {
    public constructor() {
        super({
            type: Command.Type.ChatInput,
            kinds: [Command.Kind.Prefix],
            name: 'eval',
            description: 'Evaluate JavaScript code in the conext of this command.',
            preconditions: [
                Preconditions.BotOwnerOnly,
                Preconditions.ClientPermissions(['EmbedLinks', 'SendMessages']),
            ],
            options: [
                {
                    type: Command.OptionType.String,
                    name: 'script',
                    description: 'The JavaScript code to evaluate.',
                    required: true,
                },
            ],
        });
    }

    public override async onMessage(message: Command.Message) {
        const script = message.cleanContent.split('developer eval')[1];
        if (!script) return void message.reply('No script provided.');

        let colour = 0x2fc086;
        let output: any = '';
        const hasAwait = script.match(/await /g);
        const hasReturn = script.match(/return /g);
        const hasResolve = script.match(/(!<?\.)resolve\(/g);

        if (hasAwait && !hasReturn && !hasResolve)
            return message.reply('Script has await but is missing a way to return.');

        // @ts-ignore Access client in eval
        const { client } = container;

        try {
            if (!hasAwait && !hasResolve) output = eval(script);
            else if (hasReturn) output = eval(`(async()=>{${script}})()`);
            else if (hasResolve) {
                // @ts-ignore Allow use of resolve and reject in eval.
                output = new Promise((resolve, reject) => eval(`(async()=>{${script}})();`));
            }

            if (output instanceof Promise) output = await Promise.resolve(output);
            if (typeof output !== 'string') output = inspect(output);
        } catch (error) {
            output = error;
        }

        if (output instanceof Error) {
            const stack = output.stack?.toString().split('\n') || [output.message];
            output = stack.slice(0, 5).join('\n');
            colour = 0xff0000;
        }

        const embed = new EmbedBuilder()
            .setTitle('Evaluation Result')
            .setColor(colour)
            .setTimestamp()
            .addFields([
                {
                    name: 'Input',
                    value: codeBlock(script.slice(0, 1000)),
                },
                {
                    name: 'Output',
                    value: codeBlock(output.slice(0, 1000)),
                },
            ]);

        return message.reply({ embeds: [embed] });
    }
}
