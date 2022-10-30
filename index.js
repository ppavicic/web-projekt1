const express = require('express');
var https = require('https')
var fs = require('fs')
const { auth, requiresAuth } = require('express-openid-connect');
const dotenv = require('dotenv');
dotenv.config();

const app = express()
app.use(express.static('public'));
app.use(express.json());
app.set('view engine', 'ejs')
const port = process.env.PORT || 3000;

const config = {
  authRequired: false,
  idpLogout: true,
  secret: process.env.SECRET,
  baseURL: process.env.APP_URL || `http://localhost:${port}`,
  clientID: process.env.CLIENT_ID,
  issuerBaseURL: 'https://dev-q02guoproqbw6f6h.us.auth0.com',
  clientSecret: process.env.CLIENT_SECRET,
  authorizationParams: {
    response_type: 'code',
    //scope: "openid profile email"   
  },
};

app.use(auth(config));

app.get("/sign-up", (req, res) => {
  res.oidc.login({
    returnTo: '/',
    authorizationParams: {
      screen_hint: "signup",
    },
  });
});

app.get('/', (req, res) => {
  req.user = {
    isAuthenticated: req.oidc.isAuthenticated()
  };
  if (req.user.isAuthenticated) {
    req.user.name = req.oidc.user.name;
  }

  let rawdata = fs.readFileSync('schedule.json');
  let rawcomms = fs.readFileSync('comments.json');
  let scheduledata = JSON.parse(rawdata).matches;
  let commsdata = JSON.parse(rawcomms).comments;

  let map = new Map();
  let commsmap = new Map();
  let matchdays = ["Matchday 1", "Matchday 2", "Matchday 3", "Matchday 4", "Matchday 5", "Matchday 6", "Matchday 7", "Matchday 8", "Matchday 9", "Matchday 10", "Matchday 11", "Matchday 12", "Matchday 13"];
  for (let i = 0; i < matchdays.length; i++) {
    list = []
    for (var j = 0; j < scheduledata.length; j++) {
      if (matchdays[i] === scheduledata[j].round) {
        list.push(scheduledata[j])
      }
    }
    map[matchdays[i]] = list
  }
  for (let i = 0; i < matchdays.length; i++) {
    list = []
    for (var j = 0; j < commsdata.length; j++) {
      if (matchdays[i] === commsdata[j].round) {
        list.push(commsdata[j])
      }
    }
    commsmap[matchdays[i]] = list
  }

  res.render('index', {
    user: req.user,
    data: map,
    comments: commsmap
  });
});

app.post('/saveComment', requiresAuth(), function (req, res) {
  let rawdata = fs.readFileSync('comments.json');
  let commsdata = JSON.parse(rawdata);
  var d = new Date(); // for now
  vrijeme = d.getHours() + ":" + d.getMinutes()

  let comment = {
    round: req.body.matchday,
    user: req.body.username,
    time: vrijeme,
    comment: req.body.userInput
  };

  commsdata.comments.push(comment)
  let data = JSON.stringify(commsdata);
  fs.writeFileSync('comments.json', data);
  res.json({
    status: 'success'
  })
});

app.post('/updateComment', requiresAuth(), function (req, res) {
  let rawdata = fs.readFileSync('comments.json');
  let commsdata = JSON.parse(rawdata);
  var d = new Date(); // for now
  vrijeme = d.getHours() + ":" + d.getMinutes()

  let search = req.body.param1.split(';', 3)
  for (var i = 0; i < commsdata.comments.length; i++) {
    if (commsdata.comments[i].time == search[0] && commsdata.comments[i].round == req.body.param2
      && commsdata.comments[i].user == search[1] && commsdata.comments[i].comment == search[2]) {
      commsdata.comments.splice(i, 1)
    }
  }

  let comment = {
    round: req.body.param2,
    user: req.body.username,
    time: vrijeme,
    comment: req.body.userInput
  };

  commsdata.comments.push(comment)
  let data = JSON.stringify(commsdata);
  fs.writeFileSync('comments.json', data);
  res.json({
    status: 'success'
  })
});

app.post('/deleteComment', requiresAuth(), function (req, res) {
  let rawdata = fs.readFileSync('comments.json');
  let commsdata = JSON.parse(rawdata);
  let search = req.body.param1.split(';', 3)

  for (var i = 0; i < commsdata.comments.length; i++) {
    if (commsdata.comments[i].time == search[0] && commsdata.comments[i].round == req.body.param2
      && commsdata.comments[i].user == search[1] && commsdata.comments[i].comment == search[2]) {
      commsdata.comments.splice(i, 1)
    }
  }

  let data = JSON.stringify(commsdata);
  fs.writeFileSync('comments.json', data);
  res.json({
    status: 'success'
  })
});

app.post('/saveResult', requiresAuth(), function (req, res) {
  let rawdata = fs.readFileSync('schedule.json');
  let rawdata2 = fs.readFileSync('clubs.json');
  let scheduledata = JSON.parse(rawdata);
  let clubsdata = JSON.parse(rawdata2);

  let result = {
    round: req.body.matchday,
    date: "-",
    team1: req.body.club1,
    team2: req.body.club2,
    score: {
      ft: [parseInt(req.body.goals1), parseInt(req.body.goals2)]
    }
  };

  for (var i = 0; i < clubsdata.clubs.length; i++) {
    if (clubsdata.clubs[i].name == req.body.club1) {
      if (req.body.goals1 > req.body.goals2) {
        clubsdata.clubs[i].points = clubsdata.clubs[i].points + 3;
      } else if (req.body.goals1 == req.body.goals2) {
        clubsdata.clubs[i].points = clubsdata.clubs[i].points + 1;
      }
      clubsdata.clubs[i].goalsScored += parseInt(req.body.goals1);
      clubsdata.clubs[i].goalsConceded += parseInt(req.body.goals2);
    } else if (clubsdata.clubs[i].name == req.body.club2) {
      if (req.body.goals2 > req.body.goals1) {
        clubsdata.clubs[i].points = clubsdata.clubs[i].points + 3;
      } else if (req.body.goals1 == req.body.goals2) {
        clubsdata.clubs[i].points = clubsdata.clubs[i].points + 1;
      }
      clubsdata.clubs[i].goalsScored += parseInt(req.body.goals2);
      clubsdata.clubs[i].goalsConceded += parseInt(req.body.goals1);
    }
  }

  scheduledata.matches.push(result)
  let data1 = JSON.stringify(scheduledata);
  let data2 = JSON.stringify(clubsdata);
  fs.writeFileSync('schedule.json', data1);
  fs.writeFileSync('clubs.json', data2)
  res.json({
    status: 'success'
  })
});

app.post('/updateResult', function (req, res) {
  let rawdata = fs.readFileSync('schedule.json');
  let rawdata2 = fs.readFileSync('clubs.json');
  let scheduledata = JSON.parse(rawdata);
  let clubsdata = JSON.parse(rawdata2);

  console.log(req.body)
  let search = req.body.param1.split(';', 4)
  for (var i = 0; i < scheduledata.matches.length; i++) {
    if (scheduledata.matches[i].round == req.body.param2 && scheduledata.matches[i].team1 == search[0]
      && scheduledata.matches[i].team2 == search[3]) {
      scheduledata.matches[i].score.ft[0] = parseInt(req.body.userInputGoal1)
      scheduledata.matches[i].score.ft[1] = parseInt(req.body.userInputGoal2)
    }
  }

  for (var i = 0; i < clubsdata.clubs.length; i++) {
    if (clubsdata.clubs[i].name === search[0]) { //klub1 - home
      if (search[1] > search[2]) {
        clubsdata.clubs[i].points -= 3;
      } else if (search[1] == search[2]) {
        clubsdata.clubs[i].points += 1;
      } else {
        clubsdata.clubs[i].points += 3;
      }

      if (search[1] < parseInt(req.body.userInputGoal1)) {
        clubsdata.clubs[i].goalsScored += (parseInt(req.body.userInputGoal1) - parseInt(search[1]))
      } else if (search[1] > parseInt(req.body.userInputGoal1)) {
        clubsdata.clubs[i].goalsScored -= (parseInt(search[1]) - parseInt(req.body.userInputGoal1))
      }

      if (search[2] < parseInt(req.body.userInputGoal2)) {
        clubsdata.clubs[i].goalsConceded += (parseInt(req.body.userInputGoal2) - parseInt(search[2]))
      } else if (search[2] > parseInt(req.body.userInputGoal2)) {
        clubsdata.clubs[i].goalsConceded -= (parseInt(search[2]) - parseInt(req.body.userInputGoal2))
      }
    } else if (clubsdata.clubs[i].name === search[3]) { //klub2 - away
      if (search[2] > search[1]) {
        clubsdata.clubs[i].points -= 3;
      } else if (search[1] == search[2]) {
        clubsdata.clubs[i].points += 1;
      } else {
        clubsdata.clubs[i].points += 3;
      }

      if (search[2] < parseInt(req.body.userInputGoal2)) {
        clubsdata.clubs[i].goalsScored += (parseInt(req.body.userInputGoal2) - parseInt(search[2]))
      } else if (search[2] > parseInt(req.body.userInputGoal2)) {
        clubsdata.clubs[i].goalsScored -= (parseInt(search[2]) - parseInt(req.body.userInputGoal2))
      }

      if (search[1] < parseInt(req.body.userInputGoal1)) {
        clubsdata.clubs[i].goalsConceded += parseInt(parseInt(req.body.userInputGoal1) - parseInt(search[1]))
      } else if (search[1] > parseInt(req.body.userInputGoal1)) {
        clubsdata.clubs[i].goalsConceded -= parseInt(parseInt(search[1]) - parseInt(req.body.userInputGoal1))
      }

    }
  }

  let data1 = JSON.stringify(scheduledata);
  let data2 = JSON.stringify(clubsdata);
  fs.writeFileSync('schedule.json', data1);
  fs.writeFileSync('clubs.json', data2)
  res.json({
    status: 'success'
  })
});

app.post('/updateNewResult', function (req, res) {
  let rawdata = fs.readFileSync('schedule.json');
  let rawdata2 = fs.readFileSync('clubs.json');
  let scheduledata = JSON.parse(rawdata);
  let clubsdata = JSON.parse(rawdata2);

  let search = req.body.param1.split(';', 4)
  console.log(search)
  for (var i = 0; i < scheduledata.matches.length; i++) {
    if (scheduledata.matches[i].round == req.body.param2 && scheduledata.matches[i].team1 == search[0]
      && scheduledata.matches[i].team2 == search[3]) {
      scheduledata.matches[i].score.ft[0] = parseInt(req.body.userInputGoal1)
      scheduledata.matches[i].score.ft[1] = parseInt(req.body.userInputGoal2)
    }
  }

  for (var i = 0; i < clubsdata.clubs.length; i++) {
    if (clubsdata.clubs[i].name === search[0]) { //klub1 - home
      console.log(parseInt(req.body.userInputGoal1) + " " + parseInt(req.body.userInputGoal2))
      if (parseInt(req.body.userInputGoal1) < parseInt(req.body.userInputGoal2)) {
        console.log(clubsdata.clubs[i].points)
      } else if (parseInt(req.body.userInputGoal1) == parseInt(req.body.userInputGoal2)) {
        clubsdata.clubs[i].points += 1;
      } else {
        clubsdata.clubs[i].points += 3;
      }

      console.log( clubsdata.clubs[i].goalsScored)
      clubsdata.clubs[i].goalsScored += parseInt(req.body.userInputGoal1)
      clubsdata.clubs[i].goalsConceded += parseInt(req.body.userInputGoal2)
      console.log( clubsdata.clubs[i].goalsScored)

    } else if (clubsdata.clubs[i].name === search[3]) { //klub2 - away
      if (parseInt(req.body.userInputGoal1) > parseInt(req.body.userInputGoal2)) {
        console.log(clubsdata.clubs[i].points)
      } else if (parseInt(req.body.userInputGoal1) == parseInt(req.body.userInputGoal2)) {
        clubsdata.clubs[i].points += 1;
      } else {
        clubsdata.clubs[i].points += 3;
      }

      clubsdata.clubs[i].goalsScored += parseInt(req.body.userInputGoal2)
      clubsdata.clubs[i].goalsConceded += parseInt(req.body.userInputGoal1)
    }

  }


  let data1 = JSON.stringify(scheduledata);
  let data2 = JSON.stringify(clubsdata);
  fs.writeFileSync('schedule.json', data1);
  fs.writeFileSync('clubs.json', data2)
  res.json({
    status: 'success'
  })
});

app.get('/table', function (req, res) {
  req.user = {
    isAuthenticated: req.oidc.isAuthenticated()
  };

  if (req.user.isAuthenticated) {
    req.user.name = req.oidc.user.name;
  }

  let rawdata = fs.readFileSync('clubs.json');
  let clubsdata = JSON.parse(rawdata);
  clubsdata.clubs.sort(function (a, b) {
    if (b.points === a.points) {
      gdB = b.goalsScored - b.goalsConceded;
      gdA = a.goalsScored - a.goalsConceded;
      return gdB - gdA
    } else {
      return b.points - a.points
    }
  });
  res.render('table', {
    user: req.user,
    data: clubsdata
  });
});

if (process.env.PORT) {
  app.listen(port, function () {
    console.log(`Server running at ${process.env.APP_URL}`);
  })
} else {
  app.listen(port, (error) => {
    if (!error)
      console.log("Server is Successfully Running, and App is listening on port " + port)
    else
      console.log("Error occurred, server can't start", error);
  });
}