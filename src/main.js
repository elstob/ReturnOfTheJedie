import Vue from 'vue'
import awakenings from './assets/swdestinydb-json-data/set/AW.json'
import styles from './sass/main.scss'

var FACES = {
    'MD': 'Melee Damage',
    'RD': 'Ranged Damage',
    'Sh': 'Shield',
    'R':  'Resource',
    'Dr': 'Disrupt',
    'Dc': 'Discard',
    'F':  'Focus',
    'Sp': 'Special',
    '-':  'Blank'
};

/* eslint-disable no-new */
new Vue({
    el: '#app',
    data: {
        selected_card: '01001',
        sets: {
            Awakenings: awakenings
        },
        active_cards: [],
        rolls: []
    },
    beforeMount: function() {

        var cards;

        if (window.location.hash.substring(1) !== '') {
            cards = window.location.hash.substring(1).split(':');
            if (cards) {
                cards.forEach(card => {
                    this.selected_card = card;
                    this.addCard();
                });
            }
        }

    },
    computed: {

        average_roll: function() {

            var parsed;
            var totals = {};
            var average = {};

            this.rolls.forEach(roll => {

                parsed = this.totalRoll(roll);

                Object.keys(parsed).forEach(side => {
                    if (!totals[side]) {
                        totals[side] = parsed[side];
                    } else {
                        totals[side] = totals[side] + parsed[side];
                    }
                })

            });

            Object.keys(totals).forEach(side => {
                average[side] = (totals[side] / this.rolls.length).toFixed(3);
            });


            // Sort for consistency
            average = Object.keys(average).sort().reduce((r, k) => (r[k] = average[k], r), {});

            return average;

        },

        last_roll: function() {
            var parsed = this.totalRoll(this.rolls[this.rolls.length - 1]);
            return parsed;
        },

    },
    methods: {

        addCard: function(e) {

            var chosen;

            this.rolls = [];

            while (!chosen) {

                Object.keys(this.sets).forEach(set => {
                    chosen = this.sets[set].find(card => card.code === this.selected_card);
                });

                if (!chosen) {
                    chosen = 'failed';
                }

            }

            if (chosen === 'failed') {
                console.log('Unable to find card');
                return;
            }

            chosen = Object.assign({}, chosen);

            this.active_cards.push(chosen);

            this.updateHash();

        },

        removeCard: function(code) {

            var active_index = this.active_cards.findIndex(card => (card.code === code));

            this.rolls = [];

            this.active_cards.splice(active_index, 1);

            this.updateHash();

        },

        updateHash: function() {

            var cards = this.active_cards.map(card => card.code);
            var hash = cards.join(':');

            window.location.hash = hash;

        },

        eliteOption: function(points) {

            if (points && points.indexOf('/') > -1) {
                return true;
            }

            return false;

        },

        toggleElite: function(slot) {

            var card = this.active_cards[slot];

            this.rolls = [];

            if (!card.is_elite) {
                card.is_elite = true;
            } else {
                card.is_elite = false;
            }

        },

        roll: function(count) {

            while (count) {

                var result = [];

                this.active_cards.forEach(card => {

                    var index = Math.floor(Math.random() * card.sides.length);
                    var rolled = card.sides[index];
                    result.push(this.parseSide(rolled, card));

                    if (card.is_elite) {
                        index = Math.floor(Math.random() * card.sides.length);
                        rolled = card.sides[index];
                        result.push(this.parseSide(rolled, card));
                    }

                });

                this.rolls.push(result);

                count = count - 1;

            }

        },

        parseSide: function(side, card) {

            var breakdown, value, modified, found;
            var result = {};
            var possibilities = ['MD', 'RD', 'Sh', 'R', 'Dr', 'Dc', 'F'];
            var faction = card.faction_name.toString();

            // Handle Specials
            if (side.includes('Sp')) {
                result['Special ('+card.name+')'] = { value: 1, faction_name: faction };
                return result;
            }

            // Handle blanks and modified
            if (side.includes('-')) {

                if (side === '-') {
                    result['-'] = { value: 1, faction_name: faction };
                    return result;
                }

                side = side.substring(1);
                modified = true;

            }

            possibilities.forEach(face => {

                if (side.includes(face) && !found) {

                    found = true;

                    breakdown = side.split(face);
                    value = parseInt(breakdown[0]);
                    result[face] = { value: value || 1 };

                    if (breakdown.length === 2 && breakdown[1] !== "") {
                        result[face]['cost'] = breakdown[1];
                    }

                    if (modified) {
                        result[face]['modified'] = true;
                    }

                    result[face]['faction_name'] = faction;

                }

            });

            return result;

        },

        totalRoll: function(roll) {

            var parsed = {};

            roll.forEach(die => {

                Object.keys(die).forEach(side => {

                    var non_modified;

                    // Modified dice need a non modified equivalent to count
                    if (die[side].modified) {

                        non_modified = roll.some(other_die => {return other_die[side] && !other_die[side].modified});

                        if (!non_modified) {
                            return false;
                        }

                    }

                    if (!parsed[side]) {
                        parsed[side] = die[side].value;
                    } else {
                        parsed[side] = parsed[side] + die[side].value;
                    }

                });

            });

            return parsed;

        },

        getDieFaction: function(die) {
            var side = Object.keys(die)[0];
            return die[side]['faction_name'];
        },

        parsedDie: function(die) {

            var side = Object.keys(die)[0];
            var value = die[side].value;
            var cost = die[side]['cost'];
            var modified = die[side]['modified'];
            var icon = this.icon(side);
            var faction = die[side]['faction_name'];

            if (modified) {
                modified = '+';
            } else {
                modified = '';
            }

            if (cost) {
                cost = '<span class="cost">'+cost+'</span>';
            } else {
                cost = '';
            }

            if ((side === '-') || (side.includes('Special'))) {
                value = '';
            }

            return `<span class="die ${side}">${modified}${value}${icon}${cost}</span>`;

        },

        icon: function(key) {

            var text, icon;

            if (key.includes('Special')) {
                key = 'Sp';
            };

            text = FACES[key];

            icon = 'icon-'+text.replace(' ', '-').toLowerCase();

            return `<span class="icon ${icon}" title="${text}"></span>`;

        },

        niceSide: function(side) {

            var nice_side, matched, sorted_faces;

            sorted_faces = Object.keys(FACES).sort((a, b) => { return a.length - b.length });

            sorted_faces.forEach(face => {
                matched = false;
                if (side.includes(face) && !matched) {
                    nice_side = side.replace(face, this.icon(face));
                    matched = true;
                }
            });

            if (nice_side[0] === '-') {
                nice_side = nice_side.replace('-', '+');
            }

            return nice_side;

        },

    }
})
