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
    return {down: 0, up: 0};
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
      elevator.goToFloor(fromFloor.floorNum());
    }

    function isIdle(elevator) { return !!elevator.idle; }
  },

  elevatorIdle: function(elevator) {
    elevator.idle = true;
    this.setIndicators(elevator, "stopped");
    this.logStatus();
  },

  elevatorsFloorButtonPressed: function(elevator, desiredFloor) {
    this.logStatus();
    this.requestRoute(elevator, desiredFloor);
  },

  elevatorPassingFloor: function(elevator, floorNum, direction) {
    // TODO how should this work...
    // * deciding what floor to go to. if i have passengers: What direction are we already going? if there are floors to drop people off in that direction, go to the nearest one
    // * if no passengers, need to consult the map...
    if (floorNum == 1 && direction == "down") {
      this.setIndicators(elevator, "up");
    } else if (floorNum == this.elevators.length - 1 && direction == "up") {
      this.setIndicators(elevator, "down");
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
    var table = this.elevators.reduce(reduceIt, {});
    // console.log(table);
  },

  requestRoute: function(elevator, toFloor) {
    elevator.goToFloor(toFloor);
    // TODO don't take over an elevator, instead just register request. elevators will decide to stop when passing...
  },

  setIndicators: function(elevator, direction) {
    elevator.goingDownIndicator(direction == "down");
    elevator.goingUpIndicator(direction == "up");
  },

  update: function(dt, elevators, floors) {}
}
