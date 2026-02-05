<script lang="ts">
    export let color: string;
    export let position: number;
</script>

<svg
    class="edge-top"
    viewBox="0 0 300 20"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
>
    <path
        d="M0,20 L0,10 L30,0 L60,10 L90,0 L120,10 L150,0 L180,10 L210,0 L240,10 L270,0 L300,10 L300,20 Z"
        fill={color}
    />
</svg>

<style>
    .edge-top {
        position: absolute;
        top: -10px;
        left: 0;
        width: 100%;
        height: 20px;
        z-index: 2;
    }
</style>
