// s3rver is a local fake S3 server used only by the storage tests; it ships no types.
declare module "s3rver" {
  export default class S3rver {
    constructor(options: Record<string, unknown>);
    run(): Promise<unknown>;
    close(): Promise<void>;
  }
}
