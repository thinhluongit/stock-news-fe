// @editorjs/embed ships types at dist/index.d.ts but its package.json "exports"
// field does not expose them — add a local declaration to satisfy TypeScript.
declare module '@editorjs/embed' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Embed: any;
  export default Embed;
}
