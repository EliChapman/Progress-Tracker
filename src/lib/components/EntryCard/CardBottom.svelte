<script lang="ts">
    export let color: string;
    export let position: number;
    export let url: string;
</script>

<svg
    class="edge-bottom"
    viewBox="0 0 300 75"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
>
    <defs>
        <pattern
            id="edgeImg"
            patternUnits="objectBoundingBox"
            width="1"
            height="1"
        >
            <image
                href={url}
                width="300"
                height="20"
                preserveAspectRatio="xMidYMid slice"
            />
        </pattern>
    </defs>

    <path
        d="M1,0 L299,0 L280,45 L240,70 L175,45 L100,55 L30,42"
        fill="url(#edgeImg)"
    />
</svg>

<style>
    .edge-bottom {
        position: absolute;
        bottom: -54px;
        left: 0;
        width: 100%;
        height: 50px;
        z-index: 2;
    }
</style>
