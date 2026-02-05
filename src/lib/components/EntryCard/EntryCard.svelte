<script lang="ts">
    import type { Entry } from "$lib/types";
    import { tracker } from "$lib/stores/tracker";
    import CardTop from "./CardTop.svelte";
    import CardBottom from "./CardBottom.svelte";

    export let entry: Entry;
    export let position: number;

    $: milestones = entry.milestones ?? [];
    $: doneCount = milestones.filter((m) => m.done).length;
    $: progress = milestones.length ? doneCount / milestones.length : 0;

    function toggleMilestone(id: string) {
        tracker.toggleMilestone(entry.id, id);
    }

    console.log(entry);
</script>

<div
    class="card"
    style="border-color: {entry.theme
        .primary}; background-image: url('{entry.cover_url}')"
>
    <CardTop color={entry.theme.primary} {position} />
    <div class="title">
        {entry.title}
        <span style="float:right; font-weight:600"
            >{Math.round(progress * 100)}%</span
        >
    </div>
    <div class="progress">
        <div class="bar" style="width: {Math.round(progress * 100)}%"></div>
    </div>
    <!-- <div class="milestones">
        {#each entry.milestones as m}
            <button
                class="chip {m.done ? 'done' : ''}"
                type="button"
                aria-pressed={m.done}
                aria-label={m.label}
                on:click={() => toggleMilestone(m.id)}
            >
                <img src={m.imageUrl ?? entry.cover_url} alt={m.label} />
            </button>
        {/each}
    </div> -->
    <CardBottom
        color={entry.theme.primary}
        {position}
        url={entry.cover_url || ""}
    />
</div>

<style>
    .card {
        background: #3b3b3b;
        color: white;
        padding: 16px;
        border-radius: 10px;
        border: 4px solid;
        position: relative;
        height: 20%;
        background-size: cover;
        background-position: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        margin-top: 10px; /* space for top edge */
    }
    .title {
        font-weight: 700;
        font-size: 20px;
        margin-bottom: 6px;
    }
    .progress {
        height: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        overflow: hidden;
        margin: 8px 0;
    }
    .progress > .bar {
        height: 100%;
        background: linear-gradient(90deg, #00d4a6, #00a3ff);
    }
    .milestones {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
        align-items: center;
    }
    .chip {
        background: transparent;
        padding: 0;
        border-radius: 6px;
        cursor: pointer;
        border: 0;
        opacity: 0.6;
    }
    .chip.done {
        text-decoration: line-through;
        opacity: 1;
    }
    .chip img {
        width: 56px;
        height: 56px;
        object-fit: cover;
        border-radius: 6px;
        display: block;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
        opacity: 0.45;
    }
    .chip.done img {
        opacity: 1;
        filter: grayscale(0.4);
    }
</style>
