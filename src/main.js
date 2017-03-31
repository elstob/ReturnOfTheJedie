import Vue from 'vue'
import awakenings from './assets/swdestinydb-json-data/set/AW.json'
import sor from './assets/swdestinydb-json-data/set/SoR.json'
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
            Awakenings: awakenings,
            [`Spirit of Rebellion`]: sor
        },
        active_cards: [],
        rolls: [],
        sorted_faces: Object.keys(FACES).sort((a, b) => { return a.length - b.length }),
        show_permutations: false
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

        permutations: function() {

            var all_permutations, totaled_permutations, collated_permutations;
            var cards = [];

            this.active_cards.forEach(card => {

                cards.push(card);

                if (card.is_elite) {
                    cards.push(card);
                }

            });

            all_permutations = this.getParsedPermutations(cards);
            totaled_permutations = all_permutations.map(permutation => this.totalRoll(permutation));
            collated_permutations = this.collatePermutations(totaled_permutations);

            // Sort collated permutations by probability (descending)
            collated_permutations.sort((a, b) => (b.probability - a.probability));

            return collated_permutations;

        },

        average_roll: function() {

            var parsed;
            var parsed_rolls = [];
            var totals = {};
            var averages = {};

            this.rolls.forEach(roll => {

                parsed = this.totalRoll(roll);

                Object.keys(parsed).forEach(side => {
                    if (!totals[side]) {
                        totals[side] = parsed[side];
                    } else {
                        totals[side] = totals[side] + parsed[side];
                    }
                })

                parsed_rolls.push(parsed);

            });

            Object.keys(totals).forEach(side => {

                var mean, values, square_diffs, avg_square_diffs, std_dev;

                averages[side] = {};
                mean = (totals[side] / this.rolls.length).toFixed(3);

                // Calculate Population Stand Deviation
                values = parsed_rolls.map(roll => (roll[side] || 0));
                square_diffs = values.map(value => {
                    var diff = value - mean;
                    var sqr_diff = diff * diff;
                    return sqr_diff;
                });

                avg_square_diffs = square_diffs.reduce((sum, value) => (sum + value), 0) / this.rolls.length;

                std_dev = Math.sqrt(avg_square_diffs).toFixed(3);

                averages[side]['mean'] = mean;
                averages[side]['sd'] = std_dev;

            });

            Object.keys(averages).forEach(side => {
                averages[side]['max'] = Math.max(...parsed_rolls.map(roll => roll[side]).filter(n => (n !== undefined)));
            });

            // Sort for consistency
            averages = Object.keys(averages).sort().reduce((r, k) => (r[k] = averages[k], r), {});

            return averages;

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

            // Hack to trigger reactivity on active_cards
            // #TODO: Work out how to make this smarter
            this.active_cards = this.active_cards.slice();

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

            // Handle blanks
            if (side === '-') {
                result['-'] = { value: 1, faction_name: faction };
                return result;
            }

            // Handle modified
            if (side.includes('+')) {
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

            if (!text) {
                return key;
            }

            icon = 'icon-'+text.replace(' ', '-').toLowerCase();

            return `<span class="icon ${icon}" title="${text}"></span>`;

        },

        niceSide: function(side) {

            var nice_side, matched, sorted_faces;

            this.sorted_faces.forEach(face => {
                matched = false;
                if (side.includes(face) && !matched) {

                    nice_side = side.replace(face, this.icon(face));
                    matched = true;

                }
            });

            return nice_side;

        },

        getParsedPermutations: function(cards) {

            var all_permutations = [];

            // For each die
            cards.forEach(card => {

                var new_permutations = [];
                var die = card.sides;

                if (all_permutations.length === 0) {

                    die.forEach(side => {
                        new_permutations.push([this.parseSide(side, card)]);
                    });

                } else {

                    all_permutations.forEach(permutation => {

                        die.forEach(side => {
                            var new_permutation = permutation.slice();
                            var parsed_side = this.parseSide(side, card);
                            new_permutation.push(parsed_side);
                            new_permutations.push(new_permutation);
                        });

                    });

                }

                all_permutations = new_permutations;

            });

            return all_permutations;

        },

        collatePermutations: function(permutations) {

            var hashed_permutations = {};
            var collated_permutations = [];
            var total_permutations = permutations.length;

            var sorted_permutations = permutations.map(permutation => {

                var ordered = {};
                Object.keys(permutation).sort().forEach(key => {
                    ordered[key] = permutation[key];
                });

                return ordered;

            });

            sorted_permutations.forEach(permutation => {

                var hash = JSON.stringify(permutation);

                if (!hashed_permutations[hash]) {
                    hashed_permutations[hash] = 1;
                } else {
                    hashed_permutations[hash] = hashed_permutations[hash] + 1;
                }

            });

            collated_permutations = Object.keys(hashed_permutations).map(hash => {
                var result = {};
                var count = hashed_permutations[hash];
                result['result'] = JSON.parse(hash);
                result['count'] = count;
                result['probability'] = (count / total_permutations).toFixed(3);
                result['percentage'] = ((count / total_permutations) * 100).toFixed(3);

                if (Object.keys(result['result']).length === 0) {
                    result['result'] = {
                        'Unresolvable (e.g. only modified dice)': 0
                    }
                }

                return result;
            });

            return collated_permutations;

        },

        togglePermutations: function() {

            if (this.show_permutations) {
                this.show_permutations = false;
            } else {
                this.show_permutations = true;
            }

        }

    }
})
