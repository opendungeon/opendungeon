<script lang="ts">
  import StaticModelViewer from "#lib/components/StaticModelViewer.svelte";
  import StyledButton from "#lib/components/StyledButton.svelte";
  import type { Character } from "#lib/server/database/characters.ts";
  import { enhance } from "$app/forms";
  import * as GLM from "gl-matrix";

  type Props = {
    active: boolean;
    characters: Character[];
    selectedCharacterId: string | null;
    onDeleteCharacter: (characterId: string) => void;
    onSelectCharacter: (characterId: string | null) => void;
    onToggleDraggingCharacter: (characterId: string) => void;
  };

  let {
    active,
    characters,
    selectedCharacterId,
    onDeleteCharacter,
    onSelectCharacter,
    onToggleDraggingCharacter,
  }: Props = $props();
</script>

<div
  data-active={active}
  class="hidden flex-col gap-4 overflow-y-hidden p-4 data-[active=true]:flex"
>
  <h3 class="self-center text-2xl">Characters</h3>
  <form
    method="POST"
    action="?/createCharacter"
    enctype="multipart/form-data"
    use:enhance
    class="flex gap-2"
  >
    <input
      type="text"
      placeholder="Character Name"
      name="name"
      autocomplete="off"
      onkeydown={(event) => {
        if (event.key === "Escape") {
          const target = event.target! as HTMLInputElement;
          target.blur();
        }
      }}
      class="w-full self-center rounded-sm border-2 border-aurora-gray-600 bg-aurora-gray-1300 px-1.5 py-2 backdrop-blur-xs duration-100 focus:border-aurora-gray-200 focus:outline-hidden"
    />
    <StyledButton label="Create" class="w.min px-4" />
  </form>
  <ul class="flex flex-col gap-4 overflow-y-auto px-2">
    {#each characters as character, i (i)}
      <li class="flex flex-row items-center justify-between gap-4">
        <div class="flex flex-row items-center gap-4">
          <!-- TODO: Use character model uri -->
          <StaticModelViewer
            modelUri="/human.male.glb"
            width={64}
            height={64}
            onpointerdown={() => onToggleDraggingCharacter(character.character_id)}
            onpointerup={() => onToggleDraggingCharacter(character.character_id)}
            onclick={() => {
              if (selectedCharacterId === character.character_id) {
                onSelectCharacter(null);
              } else {
                onSelectCharacter(character.character_id);
              }
            }}
            autoRotate
            cameraPosition={GLM.vec3.fromValues(0, -0.9, 0)}
            data-selected={selectedCharacterId === character.character_id}
            class="size-16 rounded border-2 border-aurora-gray-800 hover:border-aurora-gray-100 data-[selected=true]:border-aurora-gray-100"
          />
          {character.name}
        </div>
        <div class="flex flex-row items-center gap-4">
          <StyledButton
            label="Delete"
            onclick={() => onDeleteCharacter(character.character_id)}
            class="px-2"
          />
        </div>
      </li>
    {/each}
  </ul>
</div>
