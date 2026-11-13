<script module lang="ts">
  export type Message =
    | { isSystemMessage: false; userId: string; message: string }
    | { isSystemMessage: true; heading: string; subheading?: string };
</script>

<script lang="ts">
  import type { GameMaster, GamePlayer } from "#lib/server/games/index.ts";
  import { getInitials } from "#lib/utils.ts";
  import { Avatar } from "melt/components";

  type Props = {
    active: boolean;
    messages: Message[];
    players: Record<string, GameMaster | GamePlayer>;
    chatInput: HTMLInputElement;
    onChat: (message: string) => void;
    onCommand: (command: string, args: string[]) => void;
  };

  let { active, messages, players, chatInput = $bindable(), onChat, onCommand }: Props = $props();
</script>

<div data-active={active} class="hidden data-[active=true]:flex flex-1 flex-col min-h-0">
  <ul
    class="flex min-h-0 gap-2 overflow-y-auto px-2 py-2 content-end flex-col flex-1 flex-col-reverse"
  >
    {#each messages.toReversed().slice(0, 50) as message, i (i)}
      {#if message.isSystemMessage}
        <li
          class="flex min-w-0 flex-col gap-2 rounded-sm bg-aurora-gray-1300 p-2 wrap-break-word text-white"
        >
          <div class="flex flex-col text-sm">
            <p>{message.heading}</p>
            {#if message.subheading}
              <p class="text-aurora-gray-600">{message.subheading}</p>
            {/if}
          </div>
        </li>
      {:else}
        <li
          class="flex min-w-0 flex-col gap-2 rounded-sm bg-aurora-gray-1200 p-2 wrap-break-word text-white"
        >
          <div class="flex flex-row items-center gap-2">
            <div
              class="h-8 w-8 items-center rounded-full border-2 border-aurora-gray-600 bg-aurora-gray-1400 text-center"
            >
              <Avatar
                src={!players[message.userId].avatarUri
                  ? ""
                  : `/api/media/${players[message.userId].avatarUri}`}
              >
                {#snippet children(avatar)}
                  <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                  <span {...avatar.fallback} class="-mt-1 text-lg">
                    {getInitials(players[message.userId].username)}
                  </span>
                {/snippet}
              </Avatar>
            </div>
            <h3 class="text-lg">{players[message.userId].username}</h3>
          </div>
          <p>{message.message}</p>
        </li>
      {/if}
    {/each}
  </ul>
  <form
    onsubmit={(event) => {
      event.preventDefault();

      const target = event.target! as HTMLFormElement;
      const data = new FormData(target);
      const message = String(data.get("message")).trim();
      if (!message) {
        return;
      }

      if (message.startsWith("/")) {
        const [command, ...args] = message.replace("/", "").split(/\s+/);
        onCommand(command, args);
      } else {
        onChat(message);
      }

      target.reset();
    }}
    class="grid border-t-2 border-aurora-gray-400 bg-aurora-gray-1200"
  >
    <input
      bind:this={chatInput}
      type="text"
      name="message"
      placeholder="Type something..."
      maxlength={256}
      autocomplete="off"
      onkeydown={(event) => {
        if (event.key === "Escape") {
          chatInput?.blur();
        }
      }}
      class="w-full bg-aurora-gray-1300 px-1.5 py-2 duration-100 focus:border-aurora-gray-200 focus:outline-hidden"
    />
  </form>
</div>
