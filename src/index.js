import R from 'ramda';
import Rx from 'rx';
import Immutable from 'immutable';
import { compose, applyMiddleware, createStore } from 'redux';

const ActionTypes = Object.freeze({
  move: 'MOVE',
  incrementHP: 'INCREMENT_HP',
  choose: 'CHOOSE'
});

const ActionCreators = Object.freeze({
  move: direction => ({
    type: ActionTypes.move,
    payload: { direction }
  }),
  choose: () => ({
    type: ActionTypes.choose
  })
});

const Reducers = Object.freeze({
  [ActionTypes.move]: {
    next: (state, { payload, meta }) => {
      const userId = state.get('userId');
      const player = state.getIn(['actors', `${userId}` ]);
      const [z, y, x] = player.get('position');
      const map = state.get('map');
      const cols = map.get(z).size;
      const rows = map.getIn([z, y]).size;
      console.log(cols);
      let _z = z;
      let _y = y;
      let _x = x;
      switch (payload.direction) {
        case 'up'   : _y = y - 1 + (cols-rows); break;
        case 'down' : _y = y + 1 - (cols-rows); break;
        case 'left' : _x = x - 1; break;
        case 'right': _x = x + 1; break;
        default: break;
      }
      const tile = map.getIn([_z, _y, _x]);
      const coords = tile && tile.get('entrances').includes(payload.direction)
        ? [_z, _y, _x]
        : [z, y, x];
      return state.setIn(['actors', `${userId}`, 'position'], coords);
    },
    throw: (state, { payload, meta }) => {
      console.error(payload);
      return state;
    }
  }
});

const rootReducer = (state, action) => {
  return Reducers[action.type]
    ? Reducers[action.type][action.error ? 'throw' : 'next'](state, action)
    : state;
}

const Tiles = Object.freeze({
  grass: {
    type: 'grass',
    symbol: '`',
    entrances: ['up', 'down', 'left', 'right']
  },
  lava: {
    type: 'lava',
    symbol: '*',
    entrances: ['up', 'down', 'left', 'right']
  },
  water: {
    type: 'water',
    symbol: '~',
    entrances: ['up', 'down', 'left', 'right']
  },
  sand: {
    type: 'sand',
    symbol: '░',
    entrances: ['up', 'down', 'left', 'right']
  },
  hole: {
    type: 'hole',
    symbol: '¤',
    entrances: []
  },
  forest: {
    type: 'forest',
    symbol: `⚚`,
    entrances: []
  }
})

const T = Tiles;

console.log(T.sand.symbol)

const Maps = Object.freeze({
  main: [
    [ // fl 0
      [ // col 0 // col 1 // col 2 // col 3 // col 4
        T.grass, T.sand, T.grass, T.grass, T.forest // row 0
      ], [
        T.grass, T.sand, T.forest, T.grass, T.sand // row 1
      ], [
        T.forest, T.grass, T.forest, T.water, T.grass // row 2
      ], [
        T.sand, T.water, T.grass, T.forest, T.grass // row 3
      ], [
        T.forest, T.forest, T.grass, T.sand, T.grass // row 4
      ]
    ]
  ]
});


const randomIndex = len => len * Math.random() << 0;
const selectRandom = l => l[randomIndex(l.length)];
const randomTile = () => selectRandom(R.values(Tiles));

// arrayOf :: * -> number -> [*]
const arrayOf = f => l => Array.isArray(l)
  ? l.map(arrayOf(x))
  : Array(l).fill(1).map(f);
const createGrid = f => (y, x) => Array(x).fill(y)
  .map(len => arrayOf(f)(len));

console.table(
  createGrid(randomTile)(10, 10)
)

const Targets = Object.freeze({
  self: () => ({
    count: 1,
    self: true,
    ally: false,
    enemy: false
  }),
  others: (count = 1) => ({
    count,
    self: false,
    ally: true,
    enemy: true
  }),
  allies: (count = 1) => ({
    count,
    self: false,
    ally: true,
    enemy: false
  }),
  enemies: (count = 1) => ({
    count,
    self: false,
    ally: false,
    enemy: true
  }),
  any: (count = 1) => ({
    count,
    self: true,
    ally: true,
    enemy: true
  }),
  all: () => ({
    count: null,
    self: true,
    ally: true,
    enemy: true
  })
})

const Items = Object.freeze({
  potion: {
    name: 'potion',
    action: ActionTypes.incrementHP,
    value: 10,
    cost: null,
    actions: [
      [{
        type: ActionTypes.incrementHP,
        value: 10,
        target: Targets.any()
      }],
    ],
  }
});

const Skills = Object.freeze({
  punch: {
    name: 'punch',
    element: null,
    actions: [
      [{
        type: ActionTypes.incrementHP,
        value: -1,
        target: Targets.enemies()
      }],
    ]
  },
  heal: {
    name: 'heal',
    element: null,
    actions: [
      [{
        type: ActionTypes.incrementHP,
        value: 10,
        target: Targets.any()
      }],
      [{
        type: ActionTypes.incrementMP,
        value: -10,
        target: Targets.self()
      }]
    ]
  }
});

const Weapons = Object.freeze({
  fists: {
    name: 'fists',
    equipped: true,
    multipliers: {
      hp: 1,
      mp: 1,
      atk: 1,
      def: 1,
    },
    slots: 0
  }
})

const initialState = Immutable.fromJS({
  map: [createGrid(randomTile)(10, 10)], //Maps.main,
  userId: 0,
  actors: {
    0: {
      id: 0,
      name: 'Player 1',
      cpu: false,
      position: [0, 0, 0], // z, x, y
      xp: 0, // elastic xp rate
      gp: 100,
      hp: [100, 100],
      mp: [100, 100],
      atk: [10, 10],
      def: [10, 10],
      stats: {
        won: 0,
        lost: 0,
        fled: 0
      },
      status: {
        conditions: {
          poisoned: null,
          burnt: null,
          asleep: null,
          frozen: null,
          confused: null
        }
      },
      items: {
        slots: 10,
        entries: [
          [Items.potion, { enabled: true, quantity: 1 }]
        ]
      },
      skills: {
        slots: 4,
        entries: [
          [Skills.punch, { enabled: true }],
          [Skills.heal, { enabled: true }],
        ]
      },
      weapons: {
        slots: 2,
        entries: [
          [Weapons.fists, { enabled: true }]
        ],
      },
      armor: {
        head: null,
        arms: null,
        torso: null,
        legs: null
      },
      pets: {
        slots: 3,
        entries: []
      }
    }
  },
  keymap: {
    13: 'return',
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
  }
});

const store = createStore(rootReducer, initialState);

// --- IO layer

const keyupEvent = Rx.Observable.fromEvent(document, 'keyup');

const keyupAction = R.curry(
  (store, ActionCreators) => R.compose(
    R.cond([
      [ // Move
        R.flip(R.contains)(['up', 'down', 'left', 'right']),
        R.compose(store.dispatch, ActionCreators.move)
      ],
      [ // Choose
        R.flip(R.contains)(['return']),
        R.compose(store.dispatch, ActionCreators.choose)
      ],
      [ // Default (noop)
        R.T,
        R.identity
      ]
    ]),
    R.flip(R.invoker(1, 'get'))(store.getState().get('keymap')),
    R.toString,
    R.prop('which')
  )
);

const keypressSubscription = keyupEvent.subscribe(
  keyupAction(
    store,
    ActionCreators,
  )
);

// --- UI layer

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import Classy from 'react-classy';


// @Classy
class Root extends Component {
  // static style = `
  //
  // `;
  constructor(props) {
    super(props);
    this.state = {
      state: store.getState()
    };
  }
  componentWillMount() {
    this.unsubscribe = store.subscribe(() => (
      console.log(
        store.getState().getIn(['actors', '0']).toJS().position
      ),
      this.setState({ state: store.getState() })
    ));
  }
  componentWillUnmount() {
    this.unsubscribe();
  }
  render() {
    const { state } = this.state;
    console.log(Immutable.Map.isMap(state));
    return (
      <div>
        <pre>
          <code style={{ lineHeight: 1 }}>{this.map}</code>
        </pre>
        <pre>
          <code>{this.tileInfo}</code>
        </pre>
      </div>
    );
  }
  get tileInfo() {
    const { state } = this.state;
    const [z, y, x] = state.getIn(['actors', '0']).toJS().position;
    const tile = state.get('map').getIn(
      state.getIn(['actors', '0']).toJS().position
    ).toJS();
    return [
      `type: ${tile.type}`,
      `floor: ${z+1}`,
      `pos-x: ${x}`,
      `pos-y: ${y}`
    ].join('\n');
  }
  get map() {
    const { state } = this.state;
    const map = state.get('map')
      .setIn(
        state.getIn(['actors', '0']).toJS().position,
        '⚉'
      )
      .get(0)
      .map(x => x.map(
        y => y.toJS ? y.toJS().symbol : y
      ))
      .toJS()
      .toString()
      .match(/.{1,20}/g)
      .join('\n')
      .replace(/\,/g,' ');
    return map;
  }
}

ReactDOM.render(<Root />, document.getElementById('root'));
