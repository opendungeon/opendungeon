<script lang="ts">
  import { MouseButton } from "#lib/controller.js";
  import { onMount } from "svelte";
  import type { HTMLCanvasAttributes } from "svelte/elements";

  type Props = {
    draw: () => void;
    tick?: (time: number, dt: number) => void;
    ondbltap?: (event: KeyboardEvent) => void;
    onkeydown?: (event: KeyboardEvent) => void;
    onkeyup?: (event: KeyboardEvent) => void;
    onleftmousedown?: (event: MouseEvent) => void;
    onmiddlemousedown?: (event: MouseEvent) => void;
    onrightmousedown?: (event: MouseEvent) => void;
    onleftmouseup?: (event: MouseEvent) => void;
    onmiddlemouseup?: (event: MouseEvent) => void;
    onrightmouseup?: (event: MouseEvent) => void;
    canvas?: HTMLCanvasElement;
  } & Omit<
    HTMLCanvasAttributes,
    | "onkeydown"
    | "onkeyup"
    | "onpointerdown"
    | "onmousedown"
    | "oncontextmenu"
    | "onpointerup"
    | "onmouseup"
  >;

  let {
    draw,
    tick,
    ondbltap,
    onkeydown,
    onkeyup,
    onleftmousedown,
    onmiddlemousedown,
    onrightmousedown,
    onleftmouseup,
    onmiddlemouseup,
    onrightmouseup,
    canvas = $bindable(),
    ...props
  }: Props = $props();

  let frameHandle = -1;
  let lastFrameTime = 0;
  let lastPressKey: string | null = null;
  let lastPressTime = 0;

  onMount(() => {
    loop();

    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  });

  function loop() {
    frameHandle = window.requestAnimationFrame((ms) => {
      const time = ms / 1000;
      const dt = time - lastFrameTime;
      tick?.(time, dt);
      draw();
      loop();
      lastFrameTime = time;
    });
  }

  function handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable
    ) {
      return;
    }

    const currentTime = Date.now();
    const delay = lastPressTime - currentTime;

    if (event.key === lastPressKey && delay < 250) {
      ondbltap?.(event);

      lastPressKey = null;
      lastPressTime = 0;
    } else {
      onkeydown?.(event);

      lastPressKey = event.key;
      lastPressTime = currentTime;
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable
    ) {
      return;
    }

    onkeyup?.(event);
  }

  function handleMouseDown(event: MouseEvent) {
    event.preventDefault();

    switch (event.button) {
      case MouseButton.Left:
        onleftmousedown?.(event);
        break;
      case MouseButton.Middle:
        onmiddlemousedown?.(event);
        break;
      case MouseButton.Right:
        onrightmousedown?.(event);
        break;
    }
  }

  function handleMouseUp(event: MouseEvent) {
    event.preventDefault();

    switch (event.button) {
      case MouseButton.Left:
        onleftmouseup?.(event);
        break;
      case MouseButton.Middle:
        onmiddlemouseup?.(event);
        break;
      case MouseButton.Right:
        onrightmouseup?.(event);
        break;
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<canvas
  bind:this={canvas}
  {...props}
  onmousedown={handleMouseDown}
  onpointerdown={handleMouseDown}
  oncontextmenu={handleMouseDown}
  onmouseup={handleMouseUp}
  onpointerup={handleMouseUp}
></canvas>
