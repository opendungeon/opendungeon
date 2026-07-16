<script lang="ts">
  import { getCellTextureUrl, createLevel } from "$lib/api.svelte";
  import GameWindow from "$lib/components/GameWindow.svelte";
  import LevelEditorToolMenu from "$lib/components/LevelEditorToolMenu.svelte";
  import LevelEditor from "$lib/game/level-editor";

  let editor = new LevelEditor();
  let tool = $state(editor.tool);
  let viewMode = $state(editor.viewMode);

  $effect(() => {
    if (tool.type === "texturebrush" || tool.type === "texturepaintbucket") {
      if (tool.texture && !editor.hasTexture(tool.texture)) {
        editor.pause();
        editor
          .loadTexture(tool.texture, getCellTextureUrl(tool.texture).toString())
          .then(() => editor.unpause())
          .catch(() => alert("Failed to load texture. Please reload the page."));
      }
    }
    editor.tool = tool;
  });

  $effect(() => {
    editor.viewMode = viewMode;
  });

  async function handleSaveLevel() {
    const res = await createLevel("level_example", editor.grid);
    if (!res.ok) {
      console.error("Failed to save level:", res.error);
    }
  }
</script>

<svelte:head>
  <title>Level Editor - OpenDungeon</title>
</svelte:head>

<main class="grid justify-start h-full relative">
  <button onclick={handleSaveLevel} class="z-10 text-white">Save</button>
  <LevelEditorToolMenu bind:tool bind:viewMode />
  <GameWindow game={editor} />
</main>
