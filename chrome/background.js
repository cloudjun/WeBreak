chrome.webRequest.onCompleted.addListener(
	function(details) {
		//console.debug(details);
		
	}, 
	{
		urls: ["<all_urls>"]
	}
);