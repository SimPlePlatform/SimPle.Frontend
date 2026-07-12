// DEFAULT_LOBBY_SLOTS was removed — Module 6 wires real seats from LobbyDto.
// DEFAULT_LOBBY_CHAT is kept deferred: lobby chat arrives with Module 7.
export const DEFAULT_LOBBY_CHAT = [
  { from:'Priya', text:"gg let's go",           color:'#38BDF8', initials:'PR', when:'-2m' },
  { from:'You',   text:'one sec, grabbing water', color:'#F0394B', initials:'AK', when:'-1m', me:true },
  { from:'Priya', text:'all good 👍',            color:'#38BDF8', initials:'PR', when:'-30s' },
];
