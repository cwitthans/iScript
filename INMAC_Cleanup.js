/********************************************************************************
	Name:			INMAC_Cleanup.js
	Author:			Enrollment Management
	Created:		11/15/2011
	Script Version: 1.0
	Last Updated:	11/15/2011
	For Version:	[6.x]
---------------------------------------------------------------------------------
    Summary:
		This script is designed to delete documents stored in various INMAC queues
		with a 'Time in Queue' greater than the following days :

		CSUC - EDI INMAC Backup 	- 7 Days
		CSUC - EDI Split Error 		- 7 Days
		DGAPINMACBackup 		- 7 Days
		DGAPINMAC2Backup 		- 7 Days
		UHFSINMACBackup 		- 7 Days
		UHFSINMAC2Backup 		- 7 Days
		Veterans_Backup             	- 7 days
		AdmisApp_Backup             	- 7 days
		PRAECPCR_Backup             	- 7 days


	Mod Summary:
			 11/15/2011 - Original Program
		cw.1 4/25/2012 - Including Common.jsh to include iScriptDebug
		cw.2 12/17/2012 - Added Veterans Backup Queue

    Business Use:
		Script designed as a scheduled INTool script.

********************************************************************************/

// *********************         Configuration        *******************

var arrQueueConfig = [
	{sourceQueue:"CSUC - EDI INMAC Backup", daysInQueue:7},
	{sourceQueue:"CSUC - EDI Split Error", daysInQueue:7},
	{sourceQueue:"DGAP_Prelim_Backup", daysInQueue:7},
	{sourceQueue:"DGAP_Final_Backup", daysInQueue:7},
	{sourceQueue:"UHFS_INMAC Backup", daysInQueue:7},
	{sourceQueue:"UHFS_INMAC2 Backup", daysInQueue:7},
	{sourceQueue:"Veterans_Backup", daysInQueue:7},
	{sourceQueue:"AdmisApp_Backup", daysInQueue:7},
	{sourceQueue:"PRAECPCR_Backup", daysInQueue:7},
	{sourceQueue:"Veterans_Backup", daysInQueue:7} //cw.2
		]

#define LOG_TO_FILE 		true	// false - log to stdout if ran by intool, false - log to inserverXX/log/ directory
#define DEBUG_LEVEL 		5		// 0 - 5.  0 least output, 5 most verbose

// *********************       End  Configuration     *******************

#include "..\\script\\Common.jsh"  //cw.1

// ********************* Initialize global variables ********************
var ProgID = "INMAC_Cleanup.js"
var debug = "";
var total_items = 0;
// ********************* Include additional libraries *******************

// ********************* Function definitions ***************************

/** ****************************************************************************
  *		Main body of script.
  *
  * @param {none} None
  * @returns {void} None
  *****************************************************************************/
function main ()
{
	try
	{
		var strH = "----------------------------------------------------------------------------------------------------\n";
		var strF = "____________________________________________________________________________________________________\n";
		//debug = new iScriptDebug("USE SCRIPT FILE NAME", LOG_TO_FILE, DEBUG_LEVEL, undefined, {strHeader:strH, strFooter:strF});
		start_dtm = new Date;
//		printf("*** %s script started @ %s ***\n", ProgID, start_dtm);
		debug = new iScriptDebug("USE SCRIPT FILE NAME", LOG_TO_FILE, DEBUG_LEVEL);
		debug.log("INFO", "%s started at [%s].\n",ProgID, start_dtm);

		debug.showINowInfo("INFO");

		for (var i = 0; i < arrQueueConfig.length; i++)
		{
				var sourceQueue = arrQueueConfig[i].sourceQueue;
				var daysInQueue = arrQueueConfig[i].daysInQueue;
				var inmacQueue = new INWfQueue();
				inmacQueue.name = sourceQueue;
				if(!inmacQueue.id)
				{
					debug.log("ERROR", "Couldn't find queue named [%s]\n", sourceQueue);
					continue;
				}
				else
				{
					debug.log("INFO", "Now retrieving items in queue: %s \n", inmacQueue.name);
				}
				var wfItems = inmacQueue.getItemList(WfItemState.Any, WfItemQueryDirection.BeforeTimestamp, 50000, new Date());

				if(!wfItems)
				{
					debug.log("ERROR", "Couldn't get items in queue: %s\n", inmacQueue.name);
					continue;
				}
				if(wfItems.length == 0)
				{
					debug.log("INFO", "No items to process in queue: %s\n", inmacQueue.name);
					continue;
				}
				total_items = total_items + wfItems.length;
				debug.log("INFO", "Items to process in queue: %s\n", wfItems.length);
				if (wfItems)
				{
					for (var w = 0; w < wfItems.length; w++)
					{
					//check errors when retrieving items from queue, if so script will quit
					if(typeof(wfItems[w]) == 'undefined' && wfItems[w])
					{
					//routeToError(wfItems, e.toString());
					debug.log("ERROR", "Blank Array Element: \n");
					continue;
				}
						var wfDoc = INWfItem.get(wfItems[w].id);
						if (!wfDoc)
						{
							debug.log("ERROR","Couldn't get doc info: %s \n", wfItems[w]);
							debug.log("ERROR","***************************************<<<<<<<<<<<<<<<<<<<<<<< \n");
							continue;
						}
						var startTime = new Date(wfDoc.queueStartTime);
						var curTime = new Date();
						var timeInQueue = new Date(curTime.getTime() - startTime.getTime());
						var oneDay = 1000*60*60*24; //one day in milliseconds
						var daysInQ = timeInQueue.getTime() / oneDay;
						if (daysInQ > daysInQueue)
						{
							debug.log("INFO", "Deleting Item [%s] %s [%s] \n", wfDoc.id, wfDoc.queueStartTime, daysInQ);
							if(!wfItems[w].destroy())
							{
								debug.log("ERROR","Failed to destroy item: %s\n", getErrMsg());
							}
						}
					}
				}
		}
	}
	catch(e)
	{
		if(!debug)
		{
			printf("\n\nFATAL iSCRIPT ERROR: %s\n\n", e.toString());
		}
		debug.log("CRITICAL", "***********************************************\n");
		debug.log("CRITICAL", "***********************************************\n");
		debug.log("CRITICAL", "**                                           **\n");
		debug.log("CRITICAL", "**    ***    Fatal iScript Error!     ***    **\n");
		debug.log("CRITICAL", "**                                           **\n");
		debug.log("CRITICAL", "***********************************************\n");
		debug.log("CRITICAL", "***********************************************\n");
		debug.log("CRITICAL", "\n\n\n%s\n\n\n", e.toString());
		debug.log("CRITICAL", "\n\nThis script has failed in an unexpected way.  Please\ncontact Perceptive Software Customer Support at 800-941-7460 ext. 2\nAlternatively, you may wish to email support@imagenow.com\nPlease attach:\n - This log file\n - The associated script [%s]\n - Any supporting files that might be specific to this script\n\n", _argv[0]);
		debug.log("CRITICAL", "***********************************************\n");
		debug.log("CRITICAL", "***********************************************\n");
	}

	finally
	{
		debug.log("INFO", "Total Items Processed: %s\n", total_items);
		debug.finish();
		return;
	}
}