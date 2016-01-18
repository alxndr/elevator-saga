{
  init: function(elevators, floors) {
    console.clear();
    this.pickupRequests = [];
    this.elevators = elevators;
    this.floors = floors;
    this.floors.forEach(function(floor) {
      this.pickupRequests[floor.floorNum()] = this.blankRequests();
      floor.on("down_button_pressed", this.floorsDownButtonPressed.bind(this, floor));
      floor.on("up_button_pressed", this.floorsUpButtonPressed.bind(this, floor));
    }, this);
    this.elevators.forEach(function(elevator, index) {
      elevator.which = index;
      elevator.on("floor_button_pressed", this.elevatorsFloorButtonPressed.bind(this, elevator));
      elevator.on("passing_floor", this.elevatorPassingFloor.bind(this, elevator));
      elevator.on("stopped_at_floor", this.elevatorStopped.bind(this, elevator));
      elevator.on("idle", this.elevatorIdle.bind(this, elevator));
    }, this);
  },

  callElevator: function(direction, fromFloor) {
    var fromFloorNum = fromFloor.floorNum(),
        elevator,
        idleElevators = this.elevators.filter(this.elevatorIsIdle);
    this.pickupRequests[fromFloorNum][direction] += 1;
    if (idleElevators.length) {
      elevator = this._randomElementFromArray(idleElevators);
      // this could attempt to pick up people along the way
      this.setIndicator(elevator, direction);
      delete elevator.idle;
      elevator.goToFloor(fromFloorNum);
      return;
    }

    this.pickupRequests[fromFloor.floorNum()][direction] += 1;
  },

  elevatorIdle: function(elevator) {
    elevator.idle = true;
    var currentFloor = elevator.currentFloor();
    if (this.pickupRequests[currentFloor].down) {
      console.log(elevator, "trying to get folks going down from", currentFloor);
      this.setIndicator(elevator, "down");
      this.pickupRequests[currentFloor].down = 0;
      return;
    }
    if (this.pickupRequests[currentFloor].up) {
      console.log(elevator, "trying to get folks going up from", currentFloor);
      this.setIndicator(elevator, "up");
      this.pickupRequests[currentFloor].up = 0;
      return;
    }
    // should look at rest of list
  },

  elevatorIsIdle: function(elevator) {
    return !!elevator.idle;
  },

  elevatorsFloorButtonPressed: function(elevator, desiredFloor) {
    elevator.goToFloor(desiredFloor); // tack it on to queue...

    var currentFloor = elevator.currentFloor();

    if (elevator.momentum) {
      var reorderedQueue = this.reorderQueue(elevator.destinationQueue, currentFloor, elevator.momentum);

      if (elevator.destinationQueue.toString() != reorderedQueue.toString()) {
        console.log("#"+elevator.which, "reordering!", elevator.destinationQueue, reorderedQueue);
        elevator.destinationQueue = reorderedQueue;
        elevator.checkDestinationQueue();
      }
    }
  },

  elevatorStopped: function(elevator, floorNum) {
    if (floorNum == 0) {
      elevator.momentum = "up";
      this.setIndicator(elevator, "up");
    } else if (floorNum == this.floors.length - 1) {
      elevator.momentum = "down";
      this.setIndicator(elevator, "down");
    }
  },

  elevatorPassingFloor: function(elevator, floorNum, direction) {
    /*
     rethinking...

     ...maybe we should completely ignore this signal... it's inconsisent, which we don't like a whole lot...

     if passingFloor isn't fired, we're stopping anyway at a floor one away. but we don't reinforce directions: could be zigzagging... (track prev floor?)
       '-> what would it look like to trigger this repeatedly? what do we want to happen?
     if it is fired: we get a read on momentum. can inspect requests for the to-be-passed floor in our momentum, and stop for them. then reorder q
     */
    elevator.momentum = direction;
  },

  floorsDownButtonPressed: function(floor) {
    this.callElevator("down", floor);
  },

  floorsUpButtonPressed: function(floor) {
    this.callElevator("up", floor);
  },

  getRandomElevator: function() {
    return this._randomElementFromArray(this.elevators);
  },

  getRandomFloor: function() {
    return this._randomIntInRange(0, this.floors.length);
  },

  reorderQueue: function(queue, currentFloor, direction) {
    var parts = this._partition(queue, function(floor) { return (floor < currentFloor) ? 0 : 1; }),
        belowFloors = parts[0].sort(this.ASC),
        aboveFloors = parts[1].sort(this.DESC);
    if (direction == "up") {
      return aboveFloors.concat(belowFloors);
    } else if (direction == "down") {
      return belowFloors.concat(aboveFloors);
    }
    return null;
  },

  setIndicator: function(elevator, direction) {
    elevator.goingDownIndicator(direction == "down");
    elevator.goingUpIndicator(direction == "up");
  },

  setIndicatorsBoth: function(elevator, value) {
    elevator.goingDownIndicator(value);
    elevator.goingUpIndicator(value);
  },

  update: function(dt, elevators, floors) {},

  // "private"

  _ASC: function (a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  },

  _DESC: function (a, b) {
    if (a > b) return -1;
    if (a < b) return 1;
    return 0;
  },

  blankRequests: function() {
    return {down: 0, up: 0};
  },

  charFor: function(term) {
    switch(term) {
    case "down":
      return "↘";
    case "up":
      return "↗";
    default:
      return term;
    }
  },

  formatPickupRequests: function() {
    var numFloors = this.floors.length;
    return this.pickupRequests.
      reverse().
      map(function(pickupRequest, reversedFloorNum) {
        return "floor "+(numFloors-reversedFloorNum-1)+": "+pickupRequest.down+"↘ " + pickupRequest.up + "↗";
      }).
      join("\n");
  },

  logStatus: function() {
    function reduceIt(dataSheet, elevator) {
      dataSheet["#" + elevator.which] = {
        idle: elevator.idle,
        pressedFloors: elevator.getPressedFloors().join(", "),
        destinationQueue: elevator.destinationQueue.join(", ")
      };
      return dataSheet;
    }
    console.log(this.elevators.reduce(reduceIt, {}));

    function reduceThatToo(dataSheet, pickupRequest, floorNum) {
      dataSheet["#" + floorNum] = pickupRequest.down+"↘ " + pickupRequest.up + "↗";
      return dataSheet;
    }
    console.log(this.pickupRequests.reduce(reduceThatToo, {}));
  },

  _partition: function(array, fn) {
    return array.reduce(function(results, element) {
      if (fn(element)) {
        results[0].push(element);
      } else {
        results[1].push(element);
      }
      return results;
    }, [[], []]);
  },

  _randomElementFromArray: function(arr) {
    return arr[this._randomIntInRange(0, arr.length)];
  },

  _randomIntInRange: function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

}
