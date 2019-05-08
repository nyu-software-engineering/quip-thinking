import React from "react";
import "./game.css";
import socket, { sendVote, getInfo } from '../../utils/api'
import { withRouter } from 'react-router-dom';

class Vote extends React.Component {
  // initialize the state of the page
  constructor(props) {
    super(props);
    this.state = {
      current: 0,
      prompts: [],
      playerID: undefined,
      chosenQuip: "",
      quip: [],
      finished: false,
      accumulator: 1,
    }
  }

  // send vote to backend
  castVote() {
    const { roomCode } = this.props.roomCode;
    sendVote(this.state.playerID, roomCode, this.state.chosenQuip);
  }

  // if user votes for the first quip
  chooseQuip1() {
    this.setState({
      chosenQuip: this.state.idQuipArray[0][1],
      playerID: this.state.idQuipArray[0][0],
    });
    this.castVote()
  }

  // if user votes for the second quip
  chooseQuip2() {
    this.setState({
      chosenQuip: this.state.idQuipArray[1][1],
      playerID: this.state.idQuipArray[1][0],
    });
    this.castVote()
  }

  addAccumulator(){
    let temp = this.state.accumlator+1;
    this.setState({
      accumulator: temp,
    });
  }

  // load the page with the prompts, first quip, and second quip
  componentDidMount(){
    const  roomCode  = this.props.roomCode
    const prompts = this.props.prompts
    console.log(roomCode);
    console.log(prompts);

    let promptArray = [];
    let quipArray = [];
    for(var key in prompts){
      console.log(key);
      promptArray.push(key);
      for(var key2 in prompts[key]){
        for(var key3 in prompts[key][key2])
        quipArray.push(prompts[key][key2][key3]);
      }
    }

    console.log(promptArray);
    console.log(quipArray);

      this.setState({
        prompts: promptArray,
        quip: quipArray,
      });

    for (var [key1, key2] in promptArray[this.state.current]) {
      this.setState({
        idQuipArray: [[key1, promptArray[this.state.current].key1], [key2, promptArray[this.state.current].key2]],
        current: this.state.current + 1,
      });
    }
  }

  // cut off connection with end-round
  componentWillUnmount() {
    socket.off('end-round')
  }
  showPrompt(accumulator){

    return(
      <div>
      Vote for the funniest quip.
      <div>{this.state.prompts[accumulator-1]}</div>
      {this.state.quip[this.state.accumulator*2-2]}
      <button>Vote</button>
      <div> </div>
      {this.state.quip[this.state.accumulator*2-1]}
      <button>Vote</button>
      </div>
    )
  }
  // call above methods when corresponding button is clicked
  render() {
    return(
  <>
    <div className="create">
        Time to vote
        { this.state.finished ?  'Waiting for other players': this.showPrompt(this.state.accumulator)}
    </div>
  </>
    )
  }

}




export default withRouter(Vote);
