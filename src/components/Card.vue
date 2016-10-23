<template>
    <div class="card">
        <h3>{{card.name}}</h3>
        <h4 v-if="card.subtitle">{{card.subtitle}}</h4>
        <p v-if="card.text">{{card.text}}</p>
        <p v-if="card.flavor"><em>{{card.flavor}}</em></p>
        <h5>Sides</h5>
        <ol>
            <li v-for="side in card.sides">{{side}}</li>
        </ol>
    </div>
</template>

<script>
module.exports = {
    props: ['card']
}
</script>

<style type="text/css">
    .card {
        display: inline-block;
        border: 1px solid black;
        margin: 10px;
        padding: 10px;
        width: 200px;
    }
</style>