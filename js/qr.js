// Relies on two classic <script> globals loaded in app.html:
//   window.QRCode  (davidshimjs/qrcodejs — generation)
//   window.jsQR    (cozmo/jsQR — decoding from camera frames)

export function renderQrCode(elementId, text) {
  const el = document.getElementById(elementId);
  el.innerHTML = "";
  // eslint-disable-next-line no-undef
  new QRCode(el, {
    text,
    width: 220,
    height: 220,
    colorDark: "#132420",
    colorLight: "#ffffff",
  });
}

// Starts the camera and calls onDecode(text) once a QR code is read.
// Returns a stop() function to release the camera.
export async function startQrScanner(videoEl, canvasEl, onDecode, onError) {
  let stream;
  let stopped = false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
  } catch (err) {
    onError && onError(err);
    return () => {};
  }
  videoEl.srcObject = stream;
  videoEl.setAttribute("playsinline", "true");
  await videoEl.play();

  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });

  function tick() {
    if (stopped) return;
    if (videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      // eslint-disable-next-line no-undef
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code && code.data) {
        onDecode(code.data);
        return; // caller decides whether to keep scanning
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return function stop() {
    stopped = true;
    stream.getTracks().forEach((t) => t.stop());
  };
}
