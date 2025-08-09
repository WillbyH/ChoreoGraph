cg.Audio.createSound({source:"alarm.mp3"},"alarm");
cg.Audio.createSound({source:"ambience.mp3"},"ambience");
cg.Audio.createSound({source:"crickets.mp3"},"crickets");
cg.Audio.createSound({source:"footsteps.mp3"},"footsteps");
cg.Audio.createSound({source:"running.mp3"},"running");

cg.Audio.declareBus("music");
cg.Audio.declareBus("sfx");
cg.Audio.sounds.crickets.play({bus:"sfx",allowBuffer:true,loop:true,fadeIn:2,volume:0.5,soundInstanceId:"crickets"});
cg.Audio.sounds.footsteps.play({bus:"sfx",allowBuffer:true,loop:true,paused:true,soundInstanceId:"footsteps"});