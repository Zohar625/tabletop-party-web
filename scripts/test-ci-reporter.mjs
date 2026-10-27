// Keep actionable failures in the check annotations when archive downloads fail.
const escapeCommand = (text) => String(text).replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
export default async function* report(source) {
  for await (const event of source) {
    if (event.type !== 'test:fail') continue;
    const error = event.data.details?.error;
    const detail = `${event.data.name}\n${error?.stack ?? error?.message ?? 'Test failed'}`.slice(0, 6000);
    yield `::error title=Node test failed::${escapeCommand(detail)}\n`;
  }
}
