<script lang="ts">
    import {
        tracker,
        syncStatus,
        lastSynced,
        refreshRemoteWithStatus,
    } from "$lib/stores/tracker";
    import { derived } from "svelte/store";
    import { createEventDispatcher } from "svelte";
    import type { Entry } from "$lib/types";

    const entries = tracker;

    const games = derived(entries, ($e) => $e.filter((x) => x.type === "game"));
    const shows = derived(entries, ($e) => $e.filter((x) => x.type === "show"));

    export let onSelect: (id: string) => void = () => {};

    const dispatch = createEventDispatcher();

    // section selection: 'game' or 'show' (default game)
    let selectedSection: "game" | "show" = "game";
    function selectSection(s: "game" | "show") {
        selectedSection = s;
        dispatch("section", s);
    }

    // helper to format relative time (very small, local-only)
    function relativeTime(ms: number) {
        const s = Math.round((Date.now() - ms) / 1000);
        if (s < 5) return "just now";
        if (s < 60) return `${s}s ago`;
        const m = Math.round(s / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.round(m / 60);
        if (h < 24) return `${h}h ago`;
        const d = Math.round(h / 24);
        return `${d}d ago`;
    }

    // derive a small class for the status dot: green = idle/success, yellow = syncing/writing, red = error/offline
    $: statusClass =
        $syncStatus === "idle"
            ? "st-green"
            : $syncStatus === "syncing" || $syncStatus === "writing"
              ? "st-yellow"
              : "st-red";
</script>

<div class="sidebar">
    <div class="section">
        <button
            class="section-header"
            class:active={selectedSection === "game"}
            type="button"
            on:click={() => selectSection("game")}
        >
            Games
        </button>
        <ul>
            {#each $games as g}
                <li>
                    <button
                        class="item"
                        type="button"
                        on:click={() => onSelect(g.id)}>{g.title}</button
                    >
                </li>
            {/each}
        </ul>
    </div>

    <div class="section">
        <button
            class="section-header"
            class:active={selectedSection === "show"}
            type="button"
            on:click={() => selectSection("show")}
        >
            Shows
        </button>
        <ul>
            {#each $shows as s}
                <li>
                    <button
                        class="item"
                        type="button"
                        on:click={() => onSelect(s.id)}>{s.title}</button
                    >
                </li>
            {/each}
        </ul>
    </div>

    <div class="sync-bar">
        <div class="status">
            <span class="status-dot {statusClass}" aria-hidden="true"></span>
            <span class="visually-hidden">Sync status: {$syncStatus}</span>
        </div>
        {#if $lastSynced}
            <div class="last">Last: {relativeTime($lastSynced)}</div>
        {/if}
        <button
            class="refresh"
            type="button"
            on:click={() => refreshRemoteWithStatus()}>Refresh</button
        >
    </div>
</div>

<style>
    .sidebar {
        width: 220px;
        height: 100%;
        background: #383838;
        color: white;
        padding: 18px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
    }
    .section {
        margin-bottom: 24px;
    }
    .section-header {
        margin: 0 0 8px 0;
        max-height: 50%;
        font-size: 18px;
        text-decoration: underline;
        background: transparent;
        color: inherit;
        border: 0;
        padding: 0;
        cursor: pointer;
    }
    .section-header.active {
        font-weight: 700;
    }
    .item {
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 6px;
    }
    .item:hover {
        background: rgba(255, 255, 255, 0.04);
    }
    .sync-bar {
        margin-top: auto;
        display: flex;
        gap: 8px;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
    }
    .sync-bar .status {
        font-size: 13px;
        opacity: 0.9;
    }
    .sync-bar .refresh {
        margin-left: auto;
        padding: 6px 8px;
        border-radius: 6px;
        cursor: pointer;
    }

    /* small colored dot for sync status */
    .status-dot {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25) inset;
        margin-right: 8px;
        vertical-align: middle;
    }
    .st-green {
        background: #2ecc71;
    }
    .st-yellow {
        background: #f1c40f;
    }
    .st-red {
        background: #e74c3c;
    }

    /* accessible visually-hidden helper */
    .visually-hidden {
        position: absolute !important;
        height: 1px;
        width: 1px;
        overflow: hidden;
        clip: rect(1px, 1px, 1px, 1px);
        white-space: nowrap;
    }

    .sync-bar .last {
        margin-left: 8px;
        font-size: 12px;
        opacity: 0.8;
    }
</style>
