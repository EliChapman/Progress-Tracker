<script lang="ts">
    import Sidebar from "$lib/components/Sidebar.svelte";
    import EntryCard from "$lib/components/EntryCard/EntryCard.svelte";
    import { tracker, refreshRemoteWithStatus } from "$lib/stores/tracker";
    import { onMount } from "svelte";
    import type { Entry } from "$lib/types";

    let selected: string | null = null;
    let section: "game" | "show" = "game";

    function handleSelect(id: string) {
        selected = id;
    }

    function handleSection(e: CustomEvent<"game" | "show">) {
        section = e.detail;
        // clear selected entry when switching sections
        selected = null;
    }

    let entries: Entry[] = [];
    const unsub = tracker.subscribe((v) => (entries = v));

    let loading = false;

    onMount(() => {
        // load remote entries on page open (fire-and-wait)
        (async () => {
            loading = true;
            try {
                await refreshRemoteWithStatus();
            } catch (err) {
                console.warn("Failed to refresh remote data", err);
            } finally {
                loading = false;
            }
        })();

        return () => unsub();
    });
</script>

<div
    style="display:flex; gap:20px; padding:20px; height:100vh; box-sizing:border-box"
>
    <Sidebar onSelect={handleSelect} on:section={handleSection} />
    <div style="flex:1">
        {#if loading}
            <div style="color:#ddd; padding:12px">Loading remote data…</div>
        {/if}
        {#each entries.filter((x) => x.type === section) as e, index}
            {#if !selected || selected === e.id}
                <EntryCard entry={e} position={index} />
            {/if}
        {/each}
    </div>
</div>
