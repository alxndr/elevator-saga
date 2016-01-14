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
      elevator.on("idle", this.elevatorIdle.bind(this, elevator));
    }, this);
  },

  blankRequests: function() {
    return {down: 0, up: 0, enRoute: {down: false, up: false}};
  },

  callElevator: function(direction, fromFloor) {
    var fromFloorNum = fromFloor.floorNum(),
        elevator,
        idleElevators = this.elevators.filter(isIdle);
    this.pickupRequests[fromFloorNum][direction] += 1;
    if (idleElevators.length) {
      elevator = this.findRandomElement(idleElevators);
      this.setIndicators(elevator, direction);
      delete elevator.idle;
      elevator.goToFloor(fromFloorNum);
      return;
    }

    this.pickupRequests[fromFloor.floorNum()][direction] += 1;

    function isIdle(elevator) { return !!elevator.idle; }
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

  elevatorIdle: function(elevator) {
    elevator.idle = true;
    var currentFloor = elevator.currentFloor();
    if (this.pickupRequests[currentFloor].down && !this.pickupRequests[currentFloor].enRoute.down) {
      this.setIndicators(elevator, "down");
      this.pickupRequests[currentFloor].down = 0;
      this.pickupRequests[currentFloor].enRoute.down = false;
      return;
    }
    if (this.pickupRequests[currentFloor].up && !this.pickupRequests[currentFloor].enRoute.up) {
      this.setIndicators(elevator, "up");
      this.pickupRequests[currentFloor].up = 0;
      this.pickupRequests[currentFloor].enRoute.up = false;
      return;
    }
    // this.logStatus();
  },

  elevatorsFloorButtonPressed: function(elevator, desiredFloor) {
    this.requestRoute(elevator, desiredFloor);
    var direction,
        currentFloor = elevator.currentFloor();
    if (currentFloor < desiredFloor) {
      direction = "up";
    } else if (currentFloor > desiredFloor) {
      direction = "down";
    }
    this.pickupRequests[currentFloor].enRoute[direction] = false; // we've been picked up
    var reorderedQueue = this.reorderQueue(elevator.destinationQueue, currentFloor, direction);
    if (elevator.destinationQueue.toString() != reorderedQueue.toString()) {
      elevator.destinationQueue = reorderedQueue;
      elevator.checkDestinationQueue();
    }
    // TODO now is where we want to set our indicators...
  },

  reorderQueue: function(queue, currentFloor, direction) {
    var parts = this.partition(queue, function(floor) { return (floor < currentFloor) ? 0 : 1; }),
        belowFloors = parts[0].sort(this._ASC),
        aboveFloors = parts[1].sort(this._DESC);
    if (direction == "up") {
      return aboveFloors.concat(belowFloors);
    } else if (direction == "down") {
      return belowFloors.concat(aboveFloors);
    }
    return null;
  },

  partition: function(array, fn) {
    return array.reduce(function(results, element) {
      if (fn(element)) {
        results[0].push(element);
      } else {
        results[1].push(element);
      }
      return results;
    }, [[], []]);
  },

  elevatorPassingFloor: function(elevator, floorNum, direction) {
    if (floorNum == 1 && direction == "down") {
      // this currently only works for 4 floors or more... how to indicate down when having stopped on 1 and then going down?
      this.setIndicators(elevator, "up");
    } else if (floorNum == this.elevators.length - 1 && direction == "up") {
      this.setIndicators(elevator, "down");
    }

    var loadFactor = elevator.loadFactor();

    // if there are folks wanting to go my direction, stop and pick em up... if another elevator isn't already en route
    if (this.pickupRequests[floorNum][direction] && !this.pickupRequests[floorNum].enRoute[direction]) {
      if (loadFactor < 0.7) {
        this.pickupRequests[floorNum].enRoute[direction] = true;
        elevator.goToFloor(floorNum, true);
      }
    }
  },

  findRandomElement: function(arr) {
    return arr[this.getRandomInt(0, arr.length)];
  },

  floorsDownButtonPressed: function(floor) {
    this.callElevator("down", floor);
  },

  floorsUpButtonPressed: function(floor) {
    this.callElevator("up", floor);
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

  getRandomElevator: function() {
    return this.findRandomElement(this.elevators);
  },

  getRandomFloor: function() {
    return this.getRandomInt(0, this.floors.length);
  },

  getRandomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
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

  requestRoute: function(elevator, toFloor) {
    elevator.goToFloor(toFloor);
    // TODO don't take over an elevator, instead just register request. elevators will decide to stop when passing...
  },

  setIndicators: function(elevator, direction) {
    elevator.goingDownIndicator(direction == "down");
    elevator.goingUpIndicator(direction == "up");
  },

  update: function(dt, elevators, floors) {},

  _ASC: function (a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  },
  _DESC: function (a, b) {
    if (a > b) return -1;
    if (a < b) return 1;
    return 0;
  }

}
