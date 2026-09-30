declare module 'qrcode' {
  type Options = {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    color?: { dark?: string; light?: string };
  };
  const QRCode: { toCanvas(canvas: HTMLCanvasElement, text: string, options?: Options): Promise<void> };
  export default QRCode;
}
