$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path (Get-Location) "tmp" }
$outputPath = Join-Path $scriptRoot "..\献静艺术-钢琴积分规则-老师内部执行版.docx"
$outputPath = [System.IO.Path]::GetFullPath($outputPath)

$wdAlignParagraphLeft = 0
$wdAlignParagraphCenter = 1
$wdFormatDocumentDefault = 16

$content = @(
  @{ Text = '献静艺术钢琴积分规则'; Size = 18; Bold = $true; Align = $wdAlignParagraphCenter },
  @{ Text = '老师内部执行版（等级系统 + 积分系统）'; Size = 14; Bold = $true; Align = $wdAlignParagraphCenter },
  @{ Text = '修订日期：2026年7月19日'; Size = 10; Bold = $false; Align = $wdAlignParagraphCenter },
  @{ Text = ''; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },

  @{ Text = '一、先讲最重要的一句话'; Size = 14; Bold = $true; Align = $wdAlignParagraphLeft },
  @{ Text = '从现在开始，等级和积分分开。等级用来看成长和排名，积分用来换礼物。孩子兑换礼物以后，不会掉等级。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },

  @{ Text = '二、等级系统'; Size = 14; Bold = $true; Align = $wdAlignParagraphLeft },
  @{ Text = '等级系统使用三层展示：星星、月亮、太阳。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '1. 上课、练琴都会获得成长星。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '2. 35 颗成长星自动升级为 1 个月亮。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '3. 10 个月亮自动升级为 1 个太阳。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '4. 等级只升不降，兑换礼物不影响等级。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '5. 学生排名、皇冠、成长展示都看等级系统。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },

  @{ Text = '三、积分系统'; Size = 14; Bold = $true; Align = $wdAlignParagraphLeft },
  @{ Text = '积分系统单独存在，用来兑换礼物。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '1. 上课、练琴同时获得积分。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '2. 商城兑换时只扣积分，不扣等级。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '3. 普通礼物：积分够就能换。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '4. 高级礼物：需要达到对应等级，并且积分足够。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },

  @{ Text = '四、老师每次点击“已上课”后的操作'; Size = 14; Bold = $true; Align = $wdAlignParagraphLeft },
  @{ Text = '老师每次点击“已上课”时，系统做一次奖励结算。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '老师需要判断两件事：'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '1. 这节课回课质量是否合格。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '2. 这一周练琴情况应该给多少分。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '建议第一版规则：'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '1. 本节课合格：加 5 成长星，同时加 5 积分。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '2. 本周练琴：加 0 到 35 成长星，同时加 0 到 35 积分。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '这样老师只做一次判断，系统自动把等级和积分一起记账。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },

  @{ Text = '五、学生管理页和课时报告'; Size = 14; Bold = $true; Align = $wdAlignParagraphLeft },
  @{ Text = '1. 学生管理页按成长值高低排序。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '2. 前三名头像显示金、银、铜三种皇冠。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '3. 报告里同时显示：当前等级、累计成长值、当前积分。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '4. 这样老师能看到谁成长最快，也能看到谁还有多少积分可兑换。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },

  @{ Text = '六、为什么这样改'; Size = 14; Bold = $true; Align = $wdAlignParagraphLeft },
  @{ Text = '因为如果月亮和太阳既代表等级又拿去兑换礼物，孩子一换礼物，等级和排名就掉，会打击积极性。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '现在改成双轨制后：成长归成长，兑换归兑换，逻辑更清楚，老师解释也更轻松。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },

  @{ Text = '七、内部统一话术'; Size = 14; Bold = $true; Align = $wdAlignParagraphLeft },
  @{ Text = '1. 等级代表长期努力，不会因为换礼物下降。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '2. 积分代表兑换资格，用完就减少。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },
  @{ Text = '3. 高级礼物不是靠囤等级去换，而是达到等级门槛后，再用积分兑换。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft },

  @{ Text = '八、当前最重要的执行建议'; Size = 14; Bold = $true; Align = $wdAlignParagraphLeft },
  @{ Text = '先把老师“已上课即结算奖励”这条链路做顺，再去补商城细节。制度要先容易执行，后面才谈得上长期有效。'; Size = 12; Bold = $false; Align = $wdAlignParagraphLeft }
)

$word = $null
$doc = $null

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $doc = $word.Documents.Add()
  $selection = $word.Selection

  foreach ($item in $content) {
    $selection.Font.Name = "Calibri"
    $selection.Font.NameFarEast = "Microsoft YaHei"
    $selection.Font.Size = $item.Size
    $selection.Font.Bold = [int]$item.Bold
    $selection.ParagraphFormat.Alignment = $item.Align
    $selection.ParagraphFormat.SpaceAfter = 6
    $selection.TypeText($item.Text)
    $selection.TypeParagraph()
  }

  $doc.SaveAs([ref]$outputPath, [ref]$wdFormatDocumentDefault)
}
finally {
  if ($doc -ne $null) {
    try {
      $doc.Close()
    }
    catch {
    }
  }
  if ($word -ne $null) {
    try {
      $word.Quit()
    }
    catch {
    }
  }

  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}

Write-Output $outputPath

