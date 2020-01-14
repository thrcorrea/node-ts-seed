export class BufferConverter {
  static converter(content: any): Buffer {
    switch (typeof content) {
      case 'object':
        return Buffer.from(String(content));
      case 'string':
        return Buffer.from(String(content));
      default:
        return Buffer.from('');
    }
  }
}
